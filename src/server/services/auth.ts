import { timingSafeEqual } from 'node:crypto';
import type { z } from 'zod';
import type { loginSchema } from '@/lib/schemas';
import { getDb } from '../data/repo';
import { getServerEnv } from '../env';
import { HttpError } from '../http-error';
import { verifyCaptcha } from '../security/captcha';
import { verifyPassword } from '../security/password';
import { createSessionToken } from '../security/session';
import { clearRateLimit, consumeNonce, hashKey, hitRateLimit, peekRateLimit } from './security';

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60_000;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function minutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

/** Valida CAPTCHA, bloqueio por tentativas e credenciais. Retorna o token da sessão. */
export async function login(input: z.infer<typeof loginSchema>, ip: string, now = Date.now()): Promise<string> {
  const env = getServerEnv();
  if (!env.sessionSecret || !env.adminPasswordHash) {
    throw new HttpError(503, 'Login indisponível: configure SESSION_SECRET e ADMIN_PASSWORD_HASH no servidor.');
  }
  const db = getDb();
  const ipKey = hashKey(ip || 'desconhecido');

  const attempts = await peekRateLimit(db, 'login', ipKey, LOGIN_WINDOW_MS, now);
  if (attempts.count >= LOGIN_MAX_FAILURES) {
    throw new HttpError(429, `Muitas tentativas. Tente de novo em ${minutes(attempts.retryAfterMs)} min.`);
  }
  const fail = async (status: number, message: string, fields?: Record<string, string>) => {
    const hit = await hitRateLimit(db, 'login', ipKey, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, now);
    const left = LOGIN_MAX_FAILURES - hit.count;
    const suffix = left > 0 ? ` ${left} ${left === 1 ? 'tentativa restante' : 'tentativas restantes'}.` : '';
    return new HttpError(status, `${message}${suffix}`, fields);
  };

  const captcha = verifyCaptcha(env.sessionSecret, input.captchaToken, input.captchaAnswer, now);
  if (!captcha.ok) {
    const message = captcha.reason === 'expired' ? 'O desafio expirou. Gere um novo.' : 'Resposta do desafio incorreta.';
    throw await fail(400, message, { captchaAnswer: message });
  }
  if (!(await consumeNonce(db, captcha.nonce, captcha.expiresAt))) {
    throw await fail(400, 'Este desafio já foi usado. Gere um novo.', { captchaAnswer: 'Gere um novo desafio' });
  }

  // A senha é sempre verificada, mesmo com e-mail errado, para não revelar qual campo falhou pelo tempo.
  const passwordOk = await verifyPassword(input.password, env.adminPasswordHash);
  const emailOk = safeEqual(input.email, env.adminEmail);
  if (!passwordOk || !emailOk) throw await fail(401, 'E-mail ou senha incorretos.');

  await clearRateLimit(db, 'login', ipKey);
  return createSessionToken(env.sessionSecret, env.adminEmail);
}
