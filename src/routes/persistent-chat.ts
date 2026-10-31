import { and, asc, desc, eq, gte, ne } from 'drizzle-orm';
import type { Application, Request, Response } from 'express';
import { FixedWindowRateLimiter } from '../security/rate-limit';
import type { AppDatabase } from '../database/app-db';
import { chatMessages, chatSessions } from '../database/schema';
import { hasSameOrigin, resolveGuestOwner } from './guest-session';

const MAX_SESSIONS = 40;
const MAX_MESSAGES = 240;
const MAX_MESSAGE_CHARS = 40_000;
const MAX_CONTEXT_CHARS = 20_000;
const MAX_METADATA_CHARS = 8_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) return null;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_METADATA_CHARS) return null;
    return JSON.parse(serialized) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function publicError(response: Response, status: number, code: string): void {
  response.status(status).json({ success: false, error: code });
}

function requestLimit(
  request: Request,
  response: Response,
  limiter: FixedWindowRateLimiter,
  bucket: string
): boolean {
  const decision = limiter.consume(`${bucket}:${request.ip || 'unknown'}`);
  if (decision.allowed) return true;
  response.setHeader('Retry-After', String(Math.max(1, Math.ceil(decision.retryAfterMs / 1_000))));
  publicError(response, 429, 'RATE_LIMIT_EXCEEDED');
  return false;
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function registerPersistentChatRoutes(
  app: Application,
  database: AppDatabase | null,
  limiter = new FixedWindowRateLimiter(90, 60_000)
): void {
  const requireDatabase = (value: AppDatabase | null, response: Response): value is AppDatabase => {
    if (value) return true;
    publicError(response, 503, 'PERSISTENCE_UNAVAILABLE');
    return false;
  };

  app.get('/api/v1/persistence/chat/sessions', async (request, response) => {
    if (!requestLimit(request, response, limiter, 'chat-list')) return;
    if (!requireDatabase(database, response)) return;
    try {
      const ownerKeyHash = await resolveGuestOwner(request, response, database);
      const rows = await database
        .select({
          id: chatSessions.id,
          title: chatSessions.title,
          createdAt: chatSessions.createdAt,
          updatedAt: chatSessions.updatedAt,
        })
        .from(chatSessions)
        .where(eq(chatSessions.ownerKeyHash, ownerKeyHash))
        .orderBy(desc(chatSessions.updatedAt))
        .limit(MAX_SESSIONS);
      response.json({
        success: true,
        persistence: 'neon',
        sessions: rows.map((row) => ({ ...row, createdAt: asIso(row.createdAt), updatedAt: asIso(row.updatedAt) })),
      });
    } catch (error) {
      console.error('[Persistence] chat list failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      publicError(response, 503, 'PERSISTENCE_READ_FAILED');
    }
  });

  app.get('/api/v1/persistence/chat/sessions/:sessionId', async (request, response) => {
    if (!requestLimit(request, response, limiter, 'chat-read')) return;
    if (!requireDatabase(database, response)) return;
    const sessionId = request.params.sessionId;
    if (!UUID_PATTERN.test(sessionId)) return publicError(response, 400, 'SESSION_ID_INVALID');
    try {
      const ownerKeyHash = await resolveGuestOwner(request, response, database);
      const [session] = await database
        .select({
          id: chatSessions.id,
          title: chatSessions.title,
          createdAt: chatSessions.createdAt,
          updatedAt: chatSessions.updatedAt,
        })
        .from(chatSessions)
        .where(and(eq(chatSessions.ownerKeyHash, ownerKeyHash), eq(chatSessions.id, sessionId)))
        .limit(1);
      if (!session) return publicError(response, 404, 'SESSION_NOT_FOUND');
      const messages = await database
        .select({
          id: chatMessages.messageId,
          role: chatMessages.role,
          content: chatMessages.content,
          context: chatMessages.context,
          metadata: chatMessages.metadata,
          createdAt: chatMessages.createdAt,
          position: chatMessages.position,
        })
        .from(chatMessages)
        .where(and(eq(chatMessages.ownerKeyHash, ownerKeyHash), eq(chatMessages.sessionId, sessionId)))
        .orderBy(asc(chatMessages.position))
        .limit(MAX_MESSAGES);
      response.json({
        success: true,
        session: { ...session, createdAt: asIso(session.createdAt), updatedAt: asIso(session.updatedAt) },
        messages: messages.map((message) => ({ ...message, createdAt: asIso(message.createdAt) })),
      });
    } catch (error) {
      console.error('[Persistence] chat read failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      publicError(response, 503, 'PERSISTENCE_READ_FAILED');
    }
  });

  app.post('/api/v1/persistence/chat/sessions/:sessionId/messages', async (request, response) => {
    if (!requestLimit(request, response, limiter, 'chat-write')) return;
    if (!requireDatabase(database, response)) return;
    if (!hasSameOrigin(request)) return publicError(response, 403, 'CROSS_ORIGIN_REQUEST_BLOCKED');

    const sessionId = request.params.sessionId;
    if (!UUID_PATTERN.test(sessionId)) return publicError(response, 400, 'SESSION_ID_INVALID');
    const body = isRecord(request.body) ? request.body : null;
    if (!body) return publicError(response, 400, 'MESSAGE_BODY_INVALID');
    const messageId = typeof body.messageId === 'string' ? body.messageId : '';
    const role = body.role;
    const content = body.content;
    const context = body.context;
    const position = body.position;
    const metadata = parseMetadata(body.metadata);
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
    if (!UUID_PATTERN.test(messageId)) return publicError(response, 400, 'MESSAGE_ID_INVALID');
    if (role !== 'user' && role !== 'assistant') return publicError(response, 400, 'MESSAGE_ROLE_INVALID');
    if (typeof content !== 'string' || content.length > MAX_MESSAGE_CHARS) {
      return publicError(response, 413, 'MESSAGE_CONTENT_LIMIT');
    }
    if (context !== undefined && context !== null && (typeof context !== 'string' || context.length > MAX_CONTEXT_CHARS)) {
      return publicError(response, 413, 'MESSAGE_CONTEXT_LIMIT');
    }
    if (typeof position !== 'number' || !Number.isInteger(position) || position < 0 || position >= MAX_MESSAGES) {
      return publicError(response, 400, 'MESSAGE_POSITION_INVALID');
    }
    if (!metadata) return publicError(response, 413, 'MESSAGE_METADATA_LIMIT');

    try {
      const ownerKeyHash = await resolveGuestOwner(request, response, database);
      const now = new Date();
      const suppliedDate = typeof body.createdAt === 'string' ? new Date(body.createdAt) : now;
      const createdAt = Number.isFinite(suppliedDate.getTime()) ? suppliedDate : now;
      const safeTitle = title || 'Nueva conversación';
      await database.transaction(async (transaction) => {
        await transaction
          .insert(chatSessions)
          .values({ ownerKeyHash, id: sessionId, title: safeTitle, createdAt, updatedAt: now })
          .onConflictDoUpdate({
            target: [chatSessions.ownerKeyHash, chatSessions.id],
            set: { title: safeTitle, updatedAt: now },
          });
        await transaction
          .select({ id: chatSessions.id })
          .from(chatSessions)
          .where(and(eq(chatSessions.ownerKeyHash, ownerKeyHash), eq(chatSessions.id, sessionId)))
          .for('update');
        await transaction
          .delete(chatMessages)
          .where(
            and(
              eq(chatMessages.ownerKeyHash, ownerKeyHash),
              eq(chatMessages.sessionId, sessionId),
              gte(chatMessages.position, Number(position)),
              ne(chatMessages.messageId, messageId)
            )
          );
        await transaction
          .insert(chatMessages)
          .values({
            ownerKeyHash,
            sessionId,
            messageId,
            position: Number(position),
            role,
            content,
            context: typeof context === 'string' ? context : null,
            metadata,
            createdAt,
          })
          .onConflictDoUpdate({
            target: [chatMessages.ownerKeyHash, chatMessages.sessionId, chatMessages.messageId],
            set: {
              position: Number(position),
              role,
              content,
              context: typeof context === 'string' ? context : null,
              metadata,
              createdAt,
            },
          });
        await transaction
          .update(chatSessions)
          .set({ title: safeTitle, updatedAt: now })
          .where(and(eq(chatSessions.ownerKeyHash, ownerKeyHash), eq(chatSessions.id, sessionId)));
      });
      response.json({ success: true, persistence: 'neon' });
    } catch (error) {
      console.error('[Persistence] chat write failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      publicError(response, 503, 'PERSISTENCE_WRITE_FAILED');
    }
  });

  app.delete('/api/v1/persistence/chat/sessions/:sessionId/messages', async (request, response) => {
    if (!requestLimit(request, response, limiter, 'chat-clear')) return;
    if (!requireDatabase(database, response)) return;
    if (!hasSameOrigin(request)) return publicError(response, 403, 'CROSS_ORIGIN_REQUEST_BLOCKED');
    const sessionId = request.params.sessionId;
    if (!UUID_PATTERN.test(sessionId)) return publicError(response, 400, 'SESSION_ID_INVALID');
    try {
      const ownerKeyHash = await resolveGuestOwner(request, response, database);
      await database.transaction(async (transaction) => {
        await transaction
          .delete(chatMessages)
          .where(and(eq(chatMessages.ownerKeyHash, ownerKeyHash), eq(chatMessages.sessionId, sessionId)));
        await transaction
          .update(chatSessions)
          .set({ title: 'Nueva conversación', updatedAt: new Date() })
          .where(and(eq(chatSessions.ownerKeyHash, ownerKeyHash), eq(chatSessions.id, sessionId)));
      });
      response.json({ success: true });
    } catch (error) {
      console.error('[Persistence] chat clear failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      publicError(response, 503, 'PERSISTENCE_WRITE_FAILED');
    }
  });

  app.delete('/api/v1/persistence/chat/sessions/:sessionId', async (request, response) => {
    if (!requestLimit(request, response, limiter, 'chat-delete')) return;
    if (!requireDatabase(database, response)) return;
    if (!hasSameOrigin(request)) return publicError(response, 403, 'CROSS_ORIGIN_REQUEST_BLOCKED');
    const sessionId = request.params.sessionId;
    if (!UUID_PATTERN.test(sessionId)) return publicError(response, 400, 'SESSION_ID_INVALID');
    try {
      const ownerKeyHash = await resolveGuestOwner(request, response, database);
      await database.transaction(async (transaction) => {
        await transaction
          .delete(chatMessages)
          .where(and(eq(chatMessages.ownerKeyHash, ownerKeyHash), eq(chatMessages.sessionId, sessionId)));
        await transaction
          .delete(chatSessions)
          .where(and(eq(chatSessions.ownerKeyHash, ownerKeyHash), eq(chatSessions.id, sessionId)));
      });
      response.json({ success: true });
    } catch (error) {
      console.error('[Persistence] chat delete failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      publicError(response, 503, 'PERSISTENCE_WRITE_FAILED');
    }
  });
}
