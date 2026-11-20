import { Router } from 'express';
import { loginSchema } from '@/lib/schemas';
import { getDb, PATHS } from '../data/repo';
import { createAdminCustomToken } from '../data/firebase-db';
import { getServerEnv } from '../env';
import { HttpError } from '../http-error';
import { clearSessionCookie, clientIp, noStore, readCookie, setSessionCookie } from '../middleware';
import { createCaptcha } from '../security/captcha';
import { SESSION_COOKIE, verifySessionToken } from '../security/session';
import { login } from '../services/auth';
import { hashKey, hitRateLimit } from '../services/security';

export const authRouter = Router();
authRouter.use(noStore);

authRouter.get('/captcha', async (req, res) => {
  const env = getServerEnv();
  if (!env.sessionSecret) throw new HttpError(503, 'Login indisponível: configure SESSION_SECRET.');
  const rate = await hitRateLimit(getDb(), 'captcha', hashKey(clientIp(req) || 'desconhecido'), 40, 10 * 60_000);
  if (!rate.allowed) throw new HttpError(429, 'Muitos desafios gerados. Aguarde alguns minutos.');
  const challenge = createCaptcha(env.sessionSecret);
  res.json({
    token: challenge.token,
    image: `data:image/svg+xml;base64,${Buffer.from(challenge.svg).toString('base64')}`,
    expiresAt: challenge.expiresAt,
  });
});

authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const token = await login(input, clientIp(req));
  setSessionCookie(res, token);
  res.json({ ok: true });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/** Estado da sessão + custom token do Firebase para o painel ouvir os pedidos em tempo real. */
authRouter.get('/session', async (req, res) => {
  const env = getServerEnv();
  const session = env.sessionSecret ? await verifySessionToken(env.sessionSecret, readCookie(req, SESSION_COOKIE)) : null;
  if (!session) {
    res.json({ authenticated: false });
    return;
  }
  let firebaseToken: string | null = null;
  if (env.driver === 'firebase' && env.firebaseAdmin && env.firebaseClientReady) {
    try {
      firebaseToken = await createAdminCustomToken(env.firebaseAdmin, 'srburguer-admin');
    } catch (error) {
      console.error('[srburguer] Falha ao criar custom token do Firebase', error);
    }
  }
  const db = getDb();
  const tutorialCompletedAt = db ? await db.get<number>(`${PATHS.meta}/tutorialCompletedAt`) : null;
  res.json({
    authenticated: true,
    email: session.sub,
    driver: env.driver,
    realtime: firebaseToken ? 'firebase' : 'polling',
    firebaseToken,
    tutorialCompleted: Boolean(tutorialCompletedAt),
    problems: env.problems,
  });
});
