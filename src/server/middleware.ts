import { parseCookie, stringifySetCookie } from 'cookie';
import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { getServerEnv } from './env';
import { HttpError } from './http-error';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, verifySessionToken, type AdminSession } from './security/session';

declare module 'express-serve-static-core' {
  interface Request {
    admin?: AdminSession;
  }
}

export function clientIp(req: Request): string {
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real) return real;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0]?.trim() ?? '';
  return req.socket.remoteAddress ?? '';
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  return parseCookie(header)[name];
}

export function setSessionCookie(res: Response, token: string): void {
  const env = getServerEnv();
  res.setHeader(
    'Set-Cookie',
    stringifySetCookie({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    }),
  );
}

export function clearSessionCookie(res: Response): void {
  const env = getServerEnv();
  res.setHeader(
    'Set-Cookie',
    stringifySetCookie({ name: SESSION_COOKIE, value: '', httpOnly: true, secure: env.isProduction, sameSite: 'strict', path: '/', maxAge: 0 }),
  );
}

/** Bloqueia requisições de escrita vindas de outra origem (CSRF), somado ao cookie SameSite=Strict. */
export function sameOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;
  try {
    if (new URL(origin).host === host) return next();
  } catch {
    /* origem inválida */
  }
  next(new HttpError(403, 'Origem não permitida.'));
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const env = getServerEnv();
  if (!env.sessionSecret) return next(new HttpError(503, 'Sessão indisponível: configure SESSION_SECRET.'));
  const session = await verifySessionToken(env.sessionSecret, readCookie(req, SESSION_COOKIE));
  if (!session) return next(new HttpError(401, 'Sessão expirada. Entre novamente.'));
  req.admin = session;
  next();
}

export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/** Revalida as páginas estáticas que mostram cardápio e loja (ISR sob demanda do Next). */
export async function revalidatePublic(res: Response): Promise<void> {
  const revalidate = (res as unknown as { revalidate?: (path: string) => Promise<void> }).revalidate;
  if (typeof revalidate !== 'function') return;
  await Promise.all(
    ['/', '/llms.txt'].map(async (path) => {
      try {
        await revalidate.call(res, path);
      } catch (error) {
        if (getServerEnv().isProduction) console.warn(`[srburguer] Falha ao revalidar ${path}`, error);
      }
    }),
  );
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, 'Rota não encontrada.'));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;
  if (error instanceof ZodError) {
    const flat = z.flattenError(error);
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.');
      if (key && !fields[key]) fields[key] = issue.message;
    }
    res.status(400).json({ error: flat.formErrors[0] ?? 'Confira os campos destacados.', fields });
    return;
  }
  if (error instanceof HttpError) {
    if (error.status === 429) res.setHeader('Retry-After', '60');
    res.status(error.status).json({ error: error.message, ...(error.fields ? { fields: error.fields } : {}), ...(error.code ? { code: error.code } : {}) });
    return;
  }
  if (error && typeof error === 'object' && 'type' in error && (error as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ error: 'Conteúdo grande demais.' });
    return;
  }
  if (error && typeof error === 'object' && 'type' in error && (error as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido.' });
    return;
  }
  console.error('[srburguer] Erro inesperado na API', error);
  res.status(500).json({ error: 'Erro inesperado. Tente novamente em instantes.' });
}
