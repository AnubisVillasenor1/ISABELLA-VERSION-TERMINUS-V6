import type { Application, Request, Response } from 'express';
import { V0StreamError, type V0StreamResult, type V0StreamUpdate } from 'v0';
import type { FixedWindowRateLimiter } from '../security/rate-limit';

const MAX_PROMPT_LENGTH = 8_000;
const MAX_ASSISTANT_TEXT_LENGTH = 24_000;
const CHAT_ID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;
const MODEL_ID = 'v0-mini';
const SYSTEM_PROMPT = [
  'Eres Isabella, asistente de creación de aplicaciones de TAMV ONLINE NETWORK.',
  'Responde en español por defecto y conserva una identidad visual TAMV coherente cuando el usuario la solicite.',
  'Construye artefactos privados y marcados como borrador; no afirmes que están verificados, desplegados, publicados ni integrados al repositorio actual.',
  'No conectes GitHub, Vercel, MCP, paquetes privados ni credenciales externas; no despliegues ni publiques. El espacio v0 es independiente de este proyecto.',
  'Explica límites, dependencias y posibles costos con transparencia. La persona usuaria revisa y aprueba cualquier adopción posterior.',
].join(' ');

export type V0BuilderClient = Pick<typeof import('v0').v0, 'chats' | 'messages'>;
type V0BuilderRouteDependencies = {
  app: Application;
  client: V0BuilderClient;
  authorizeApiToken: (req: Request, res: Response) => boolean;
  enforceRateLimit: (
    req: Request,
    res: Response,
    limiter: FixedWindowRateLimiter,
    bucket: string
  ) => boolean;
  limiter: FixedWindowRateLimiter;
  isConfigured: () => boolean;
};
type SseEventName = 'workspace' | 'progress' | 'text' | 'usage' | 'done' | 'error';
type SseData = Record<string, string | number | boolean | null>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPrompt(body: unknown, res: Response): string | null {
  if (!isRecord(body) || body.acknowledgedCost !== true) {
    res.status(400).json({ success: false, error: 'COST_ACKNOWLEDGEMENT_REQUIRED' });
    return null;
  }

  if (typeof body.message !== 'string' || body.message.trim().length === 0) {
    res.status(400).json({ success: false, error: 'MESSAGE_REQUIRED' });
    return null;
  }

  const message = body.message.trim();
  if (message.length > MAX_PROMPT_LENGTH) {
    res.status(413).json({ success: false, error: 'MESSAGE_TOO_LONG', maxLength: MAX_PROMPT_LENGTH });
    return null;
  }

  return message;
}

function upstreamStatus(error: unknown): number | null {
  if (!isRecord(error)) return null;
  const directStatus = error.status;
  if (typeof directStatus === 'number' && directStatus >= 400 && directStatus <= 599) {
    return directStatus;
  }

  if (isRecord(error.response)) {
    const responseStatus = error.response.status;
    if (typeof responseStatus === 'number' && responseStatus >= 400 && responseStatus <= 599) {
      return responseStatus;
    }
  }

  return null;
}

function publicErrorCode(error: unknown): string {
  const candidate = error instanceof V0StreamError ? error.code : undefined;
  return typeof candidate === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(candidate)
    ? candidate
    : 'V0_API_ERROR';
}

function sendSse(res: Response, event: SseEventName, data: SseData): void {
  if (res.destroyed || res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function readCreditTotal(usage: V0StreamUpdate['usage']): number | null {
  const total = usage?.creditsCost?.total;
  return typeof total === 'number' && Number.isFinite(total) ? total : null;
}

async function streamToResponse(
  res: Response,
  streamResult: V0StreamResult,
  initialChatId: string | null
): Promise<void> {
  const finalResult = streamResult.final;
  void finalResult.catch(() => undefined);
  let chatId = initialChatId;
  let title = 'TAMV · Isabella';
  let lastAssistantText = '';

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  sendSse(res, 'progress', {
    message: initialChatId ? 'Continuando el espacio de v0…' : 'Creando un espacio privado en v0…',
  });

  if (initialChatId) sendSse(res, 'workspace', { chatId: initialChatId, title });

  try {
    for await (const update of streamResult.stream) {
      if (res.destroyed) return;

      if (update.chat?.id) {
        chatId = update.chat.id;
        title = update.title ?? update.chat.title ?? title;
        sendSse(res, 'workspace', { chatId, title });
      }

      if (update.message?.role === 'assistant' && update.message.content) {
        lastAssistantText = update.message.content.slice(0, MAX_ASSISTANT_TEXT_LENGTH);
        sendSse(res, 'text', { text: lastAssistantText });
      }

      const credits = readCreditTotal(update.usage);
      if (credits !== null) sendSse(res, 'usage', { model: MODEL_ID, credits });
    }

    const final = await finalResult;
    chatId = final.chat?.id ?? chatId;
    title = final.title ?? final.chat?.title ?? title;
    if (!chatId) throw new V0StreamError('The v0 stream completed without a chat ID.', { code: 'V0_CHAT_ID_MISSING' });

    const reply =
      final.message?.role === 'assistant' && final.message.content
        ? final.message.content.slice(0, MAX_ASSISTANT_TEXT_LENGTH)
        : lastAssistantText;
    const credits = readCreditTotal(final.usage);
    if (reply && reply !== lastAssistantText) sendSse(res, 'text', { text: reply });
    if (credits !== null) sendSse(res, 'usage', { model: MODEL_ID, credits });
    sendSse(res, 'done', {
      chatId,
      title,
      reply,
      model: MODEL_ID,
      credits,
      state: 'draft',
    });
    res.end();
  } catch (error) {
    const code = publicErrorCode(error);
    const status = upstreamStatus(error);
    console.error('[Isabella] v0 stream failed', { code, upstreamStatus: status });
    sendSse(res, 'error', { code, upstreamStatus: status });
    res.end();
  }
}

export function registerV0BuilderRoutes(dependencies: V0BuilderRouteDependencies): void {
  const { app, client, authorizeApiToken, enforceRateLimit, limiter, isConfigured } = dependencies;

  app.post('/api/isabella/v0/chats', async (req, res) => {
    if (!authorizeApiToken(req, res)) return;
    if (!enforceRateLimit(req, res, limiter, 'isabella-v0-create')) return;
    if (!isConfigured()) {
      res.status(503).json({ success: false, error: 'V0_API_NOT_CONFIGURED' });
      return;
    }

    const message = readPrompt(req.body as unknown, res);
    if (!message) return;

    const controller = new AbortController();
    res.once('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    try {
      const stream = await client.chats.createStream(
        {
          message,
          systemPrompt: SYSTEM_PROMPT,
          modelConfiguration: { modelId: MODEL_ID, imageGenerations: false },
          mcpServerIds: [],
          privacy: 'private',
          title: 'TAMV · Isabella — proyecto de prueba',
          metadata: { source: 'tamv-isabella', state: 'draft' },
          credentialAccess: { sharedNpm: false, vercel: false, github: false },
        },
        { signal: controller.signal }
      );
      await streamToResponse(res, stream, null);
    } catch (error) {
      if (res.destroyed) return;
      const status = upstreamStatus(error);
      const code = publicErrorCode(error);
      console.error('[Isabella] v0 chat creation failed', { code, upstreamStatus: status });
      if (!res.headersSent) {
        res.status(502).json({ success: false, error: code, upstreamStatus: status });
      } else {
        sendSse(res, 'error', { code, upstreamStatus: status });
        res.end();
      }
    }
  });

  app.post('/api/isabella/v0/chats/:chatId/messages', async (req, res) => {
    if (!authorizeApiToken(req, res)) return;
    if (!enforceRateLimit(req, res, limiter, 'isabella-v0-continue')) return;
    if (!isConfigured()) {
      res.status(503).json({ success: false, error: 'V0_API_NOT_CONFIGURED' });
      return;
    }

    const rawChatId = req.params.chatId;
    const chatId = typeof rawChatId === 'string' ? rawChatId : '';
    if (!CHAT_ID_PATTERN.test(chatId)) {
      res.status(400).json({ success: false, error: 'INVALID_CHAT_ID' });
      return;
    }

    const message = readPrompt(req.body as unknown, res);
    if (!message) return;

    const controller = new AbortController();
    res.once('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    try {
      const stream = await client.messages.sendStream(
        {
          chatId,
          message,
          systemPrompt: SYSTEM_PROMPT,
          modelConfiguration: { modelId: MODEL_ID, imageGenerations: false },
          mcpServerIds: [],
        },
        { signal: controller.signal }
      );
      await streamToResponse(res, stream, chatId);
    } catch (error) {
      if (res.destroyed) return;
      const status = upstreamStatus(error);
      const code = publicErrorCode(error);
      console.error('[Isabella] v0 chat continuation failed', { code, upstreamStatus: status });
      if (!res.headersSent) {
        res.status(502).json({ success: false, error: code, upstreamStatus: status });
      } else {
        sendSse(res, 'error', { code, upstreamStatus: status });
        res.end();
      }
    }
  });
}
