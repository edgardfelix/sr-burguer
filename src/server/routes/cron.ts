import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { getServerEnv } from '../env';
import { HttpError } from '../http-error';
import { runDailyReset } from '../services/reset';

export const cronRouter = Router();

function authorized(header: string | undefined, secret: string | null): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Vercel Cron, todos os dias às 07:00 UTC (04:00 em São Paulo). */
cronRouter.get('/reset', async (req, res) => {
  if (!authorized(req.headers.authorization, getServerEnv().cronSecret)) {
    throw new HttpError(401, 'Não autorizado.');
  }
  const result = await runDailyReset();
  console.info('[srburguer] Fechamento diário', result);
  res.json({ ok: true, ...result });
});
