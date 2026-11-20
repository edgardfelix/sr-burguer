import { cookies } from 'next/headers';
import { getServerEnv } from './env';
import { SESSION_COOKIE, verifySessionToken, type AdminSession } from './security/session';

/** Sessão do painel em Server Components (layout do /admin). */
export async function getAdminSession(): Promise<AdminSession | null> {
  const env = getServerEnv();
  if (!env.sessionSecret) return null;
  const store = await cookies();
  return verifySessionToken(env.sessionSecret, store.get(SESSION_COOKIE)?.value);
}
