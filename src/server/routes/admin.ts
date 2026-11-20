import { Router } from 'express';
import { z } from 'zod';
import { businessDateOf } from '@/lib/schedule';
import {
  categoryInputSchema,
  mediaUploadSchema,
  orderStatusSchema,
  productInputSchema,
  promoSchema,
  reorderSchema,
  settingsInputSchema,
  storeModeSchema,
} from '@/lib/schemas';
import { getDb, normalizeReports, PATHS } from '../data/repo';
import { getServerEnv } from '../env';
import { revalidatePublic } from '../middleware';
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  loadMenu,
  reorderCategories,
  reorderProducts,
  restoreSeedCatalog,
  setProductAvailability,
  setProductPromo,
  setStoreMode,
  updateCategory,
  updateProduct,
  updateSettings,
} from '../services/catalog';
import { saveMedia } from '../services/media';
import { listOrders, updateOrderStatus } from '../services/orders';
import { runDailyReset } from '../services/reset';

export const adminRouter = Router();

const idParam = (value: unknown) => z.string().regex(/^[\w-]{1,80}$/).parse(value);

async function readMeta() {
  const db = getDb();
  if (!db) return { lastResetDate: null, tutorialCompletedAt: null };
  const meta = (await db.get<{ lastResetDate?: string; tutorialCompletedAt?: number }>(PATHS.meta)) ?? {};
  return { lastResetDate: meta.lastResetDate ?? null, tutorialCompletedAt: meta.tutorialCompletedAt ?? null };
}

async function readReports(limit: number) {
  const db = getDb();
  if (!db) return [];
  return normalizeReports(await db.get(PATHS.reports)).slice(0, limit);
}

/** Carga inicial do painel (e polling no modo local). */
adminRouter.get('/bootstrap', async (_req, res) => {
  const now = Date.now();
  const businessDate = businessDateOf(now);
  const [menu, orders, meta, reports] = await Promise.all([loadMenu(), listOrders(businessDate), readMeta(), readReports(14)]);
  const env = getServerEnv();
  res.json({ ...menu, orders, meta, reports, businessDate, now, driver: env.driver, problems: env.problems });
});

adminRouter.get('/orders', async (_req, res) => {
  const now = Date.now();
  const businessDate = businessDateOf(now);
  res.json({ orders: await listOrders(businessDate), businessDate, now });
});

adminRouter.patch('/orders/:id/status', async (req, res) => {
  const { status } = orderStatusSchema.parse(req.body);
  res.json({ order: await updateOrderStatus(idParam(req.params.id), status) });
});

// ------------------------------------------------------------------ cardápio

adminRouter.post('/catalog/products', async (req, res) => {
  const product = await createProduct(productInputSchema.parse(req.body));
  await revalidatePublic(res);
  res.status(201).json({ product });
});

adminRouter.put('/catalog/products/:id', async (req, res) => {
  const product = await updateProduct(idParam(req.params.id), productInputSchema.parse(req.body));
  await revalidatePublic(res);
  res.json({ product });
});

adminRouter.delete('/catalog/products/:id', async (req, res) => {
  await deleteProduct(idParam(req.params.id));
  await revalidatePublic(res);
  res.json({ ok: true });
});

adminRouter.patch('/catalog/products/:id/availability', async (req, res) => {
  const { available } = z.object({ available: z.boolean() }).parse(req.body);
  await setProductAvailability(idParam(req.params.id), available);
  await revalidatePublic(res);
  res.json({ ok: true });
});

adminRouter.patch('/catalog/products/:id/promo', async (req, res) => {
  const { promoPrice, durationMinutes } = promoSchema.parse(req.body);
  const product = await setProductPromo(idParam(req.params.id), promoPrice, durationMinutes);
  await revalidatePublic(res);
  res.json({ product });
});

adminRouter.post('/catalog/products/reorder', async (req, res) => {
  await reorderProducts(reorderSchema.parse(req.body).ids);
  await revalidatePublic(res);
  res.json({ ok: true });
});

adminRouter.post('/catalog/categories', async (req, res) => {
  const category = await createCategory(categoryInputSchema.parse(req.body));
  await revalidatePublic(res);
  res.status(201).json({ category });
});

adminRouter.put('/catalog/categories/:id', async (req, res) => {
  await updateCategory(idParam(req.params.id), categoryInputSchema.parse(req.body));
  await revalidatePublic(res);
  res.json({ ok: true });
});

adminRouter.delete('/catalog/categories/:id', async (req, res) => {
  await deleteCategory(idParam(req.params.id));
  await revalidatePublic(res);
  res.json({ ok: true });
});

adminRouter.post('/catalog/categories/reorder', async (req, res) => {
  await reorderCategories(reorderSchema.parse(req.body).ids);
  await revalidatePublic(res);
  res.json({ ok: true });
});

adminRouter.post('/catalog/restore-seed', async (req, res) => {
  z.object({ confirm: z.literal(true) }).parse(req.body);
  await restoreSeedCatalog();
  await revalidatePublic(res);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ loja

adminRouter.put('/settings', async (req, res) => {
  const settings = await updateSettings(settingsInputSchema.parse(req.body));
  await revalidatePublic(res);
  res.json({ settings });
});

adminRouter.patch('/settings/mode', async (req, res) => {
  const { mode } = storeModeSchema.parse(req.body);
  await setStoreMode(mode);
  await revalidatePublic(res);
  res.json({ ok: true, mode });
});

adminRouter.post('/media', async (req, res) => {
  const { dataUrl } = mediaUploadSchema.parse(req.body);
  res.status(201).json({ url: await saveMedia(dataUrl) });
});

// ------------------------------------------------------------------ rotina

/** Reserva do cron: o painel chama ao abrir se o fechamento do dia não rodou. */
adminRouter.post('/maintenance/reset', async (_req, res) => {
  res.json(await runDailyReset());
});

adminRouter.post('/tutorial/complete', async (_req, res) => {
  const db = getDb();
  if (db) await db.set(`${PATHS.meta}/tutorialCompletedAt`, Date.now());
  res.json({ ok: true });
});

adminRouter.get('/reports', async (_req, res) => {
  res.json({ reports: await readReports(30) });
});
