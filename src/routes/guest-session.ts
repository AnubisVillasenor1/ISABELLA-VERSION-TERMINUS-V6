import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { Request, Response } from 'express';
import type { AppDatabase } from '../database/app-db';
import { guestSessions } from '../database/schema';

const COOKIE_NAME = 'isabella_guest_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function setSessionCookie(request: Request, response: Response, token: string): void {
  const forwardedProtocol = request.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const secure = request.secure || forwardedProtocol === 'https';
  const attributes = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    `SameSite=${secure ? 'None' : 'Lax'}`,
  ];
  if (secure) attributes.push('Secure');
  response.append('Set-Cookie', attributes.join('; '));
}

export async function resolveGuestOwner(
  request: Request,
  response: Response,
  database: AppDatabase
): Promise<string> {
  const now = new Date();
  const existingToken = readCookie(request, COOKIE_NAME);
  if (existingToken && TOKEN_PATTERN.test(existingToken)) {
    const tokenHash = hashToken(existingToken);
    const [active] = await database
      .select({ tokenHash: guestSessions.tokenHash })
      .from(guestSessions)
      .where(and(eq(guestSessions.tokenHash, tokenHash), gt(guestSessions.expiresAt, now)))
      .limit(1);
    if (active) {
      await database
        .update(guestSessions)
        .set({
          lastSeenAt: now,
          expiresAt: new Date(now.getTime() + COOKIE_MAX_AGE_SECONDS * 1_000),
        })
        .where(eq(guestSessions.tokenHash, tokenHash));
      return tokenHash;
    }
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  await database.insert(guestSessions).values({
    tokenHash,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + COOKIE_MAX_AGE_SECONDS * 1_000),
  });
  setSessionCookie(request, response, token);
  return tokenHash;
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === request.get('host');
  } catch {
    return false;
  }
}
