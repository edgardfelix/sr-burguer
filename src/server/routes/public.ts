import { Router } from 'express';
import { computeStoreStatus, describeStatus } from '@/lib/schedule';
import { orderInputSchema } from '@/lib/schemas';
import { getDb } from '../data/repo';
import { getServerEnv } from '../env';
import { HttpError } from '../http-error';
import { clientIp, noStore } from '../middleware';
import { loadMenu } from '../services/catalog';
import { getMedia } from '../services/media';
import { createOrder, getOrderTracking } from '../services/orders';
import { hashKey, hitRateLimit } from '../services/security';

export const publicRouter = Router();

/**
 * Freio em memória para o acompanhamento (por instância, sem escrever no banco):
 * a tela consulta a cada 8 a 30 s; acima de 40 consultas por minuto do mesmo IP é abuso.
 */
const TRACK_LIMIT = 40;
const trackHits = new Map<string, { count: number; resetAt: number }>();

function allowTrackingRequest(ip: string, now = Date.now()): boolean {
  if (trackHits.size > 5000) {
    for (const [key, hit] of trackHits) if (hit.resetAt <= now) trackHits.delete(key);
  }
  const hit = trackHits.get(ip);
  if (!hit || hit.resetAt <= now) {
    trackHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= TRACK_LIMIT;
}

publicRouter.get('/health', noStore, (_req, res) => {
  const env = getServerEnv();
  res.json({ ok: true, driver: env.driver, time: Date.now() });
});

/** Status atual da loja (aberta/fechada). Cache curto na CDN. */
publicRouter.get('/store/status', async (_req, res) => {
  const { settings } = await loadMenu();
  const now = Date.now();
  const status = computeStoreStatus(settings, now);
  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
  res.json({ status, mode: settings.mode, now, ...describeStatus(status, now) });
});

publicRouter.get('/menu', async (_req, res) => {
  const { catalog, settings } = await loadMenu();
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  res.json({ catalog, settings });
});

publicRouter.post('/orders', noStore, async (req, res) => {
  const input = orderInputSchema.parse(req.body);
  const rate = await hitRateLimit(getDb(), 'orders', hashKey(clientIp(req) || 'desconhecido'), 6, 10 * 60_000);
  if (!rate.allowed) {
    throw new HttpError(429, 'Muitos pedidos em sequência deste aparelho. Aguarde alguns minutos ou fale com a loja.');
  }
  const order = await createOrder(input);
  res.status(201).json({ order });
});

/** Acompanhamento do pedido pelo aparelho de quem pediu (código recebido na criação). */
publicRouter.get('/orders/:id/tracking', noStore, async (req, res) => {
  if (!allowTrackingRequest(clientIp(req) || 'desconhecido')) {
    throw new HttpError(429, 'Muitas consultas seguidas. O acompanhamento volta em instantes.');
  }
  const token = typeof req.query.t === 'string' ? req.query.t : '';
  const tracking = await getOrderTracking(String(req.params.id), token);
  res.json({ tracking });
});

/** Imagens enviadas pelo painel. O ID muda a cada envio, então o cache pode ser imutável. */
publicRouter.get('/media/:id', async (req, res) => {
  const media = await getMedia(String(req.params.id));
  if (!media) throw new HttpError(404, 'Imagem não encontrada.');
  res.setHeader('Content-Type', media.mime);
  res.setHeader('Content-Length', String(media.bytes.length));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(media.bytes);
});
