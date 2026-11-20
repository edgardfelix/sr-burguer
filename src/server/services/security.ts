import { createHash } from 'node:crypto';
import type { Db } from '../data/db';
import { PATHS } from '../data/repo';

/**
 * Limites de requisição e nonces de uso único, gravados no banco
 * (funções serverless não compartilham memória entre instâncias).
 * Sem banco configurado, cai para memória do processo.
 */

interface Window {
  count: number;
  start: number;
}

const memoryWindows = new Map<string, Window>();
const memoryNonces = new Map<string, number>();

/** Chaves do RTDB não aceitam . # $ [ ] /, e não guardamos IP em claro. */
export function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export interface RateResult {
  count: number;
  allowed: boolean;
  retryAfterMs: number;
}

export async function hitRateLimit(
  db: Db | null,
  bucket: string,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateResult> {
  const step = (current: Window | null): Window =>
    !current || now - current.start >= windowMs ? { count: 1, start: now } : { count: current.count + 1, start: current.start };
  let value: Window;
  if (db) {
    const result = await db.transaction<Window>(`${PATHS.security}/rate/${bucket}/${key}`, step);
    value = result.value ?? { count: 1, start: now };
  } else {
    value = step(memoryWindows.get(`${bucket}:${key}`) ?? null);
    memoryWindows.set(`${bucket}:${key}`, value);
  }
  return { count: value.count, allowed: value.count <= limit, retryAfterMs: Math.max(0, value.start + windowMs - now) };
}

export async function peekRateLimit(db: Db | null, bucket: string, key: string, windowMs: number, now = Date.now()): Promise<RateResult> {
  const current = db ? await db.get<Window>(`${PATHS.security}/rate/${bucket}/${key}`) : (memoryWindows.get(`${bucket}:${key}`) ?? null);
  if (!current || now - current.start >= windowMs) return { count: 0, allowed: true, retryAfterMs: 0 };
  return { count: current.count, allowed: true, retryAfterMs: Math.max(0, current.start + windowMs - now) };
}

export async function clearRateLimit(db: Db | null, bucket: string, key: string): Promise<void> {
  if (db) await db.remove(`${PATHS.security}/rate/${bucket}/${key}`);
  else memoryWindows.delete(`${bucket}:${key}`);
}

/** true na primeira vez que o nonce é usado; false se já foi consumido. */
export async function consumeNonce(db: Db | null, nonce: string, expiresAt: number): Promise<boolean> {
  if (!/^[\w-]{8,64}$/.test(nonce)) return false;
  if (!db) {
    if (memoryNonces.has(nonce)) return false;
    memoryNonces.set(nonce, expiresAt);
    return true;
  }
  const result = await db.transaction<number>(`${PATHS.security}/nonces/${nonce}`, (current) => (current ? undefined : expiresAt));
  return result.committed;
}
