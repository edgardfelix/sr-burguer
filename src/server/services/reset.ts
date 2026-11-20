import { businessDateOf, shiftDate } from '@/lib/schedule';
import type { DailyReport, Order, PaymentMethod } from '@/lib/types';
import type { Db } from '../data/db';
import { getDb, normalizeOrders, PATHS } from '../data/repo';

/** Dias de pedidos arquivados mantidos no banco (o resumo diário fica para sempre). */
export const ARCHIVE_RETENTION_DAYS = 30;

export function summarizeDay(businessDate: string, orders: Order[], now: number): DailyReport {
  const byPayment: Record<PaymentMethod, number> = { pix: 0, card: 0, cash: 0 };
  const byFulfillment = { delivery: 0, pickup: 0 };
  let revenue = 0;
  let cancelled = 0;
  for (const order of orders) {
    if (order.status === 'cancelado') {
      cancelled++;
      continue;
    }
    revenue += order.total;
    byPayment[order.payment.method] += order.total;
    byFulfillment[order.fulfillment.type]++;
  }
  return { businessDate, orders: orders.length - cancelled, cancelled, revenue, byPayment, byFulfillment, closedAt: now };
}

export interface ResetResult {
  businessDate: string;
  alreadyDone: boolean;
  archived: number;
  reports: string[];
}

/**
 * Fechamento diário (idempotente): move pedidos de dias anteriores para /archive/{data},
 * grava o resumo em /reports/{data}, limpa arquivos antigos, contadores e dados de segurança.
 * Chamado pelo Vercel Cron às 04:00 e, como reserva, pelo painel ao abrir.
 */
export async function runDailyReset(now = Date.now(), dbArg?: Db | null): Promise<ResetResult> {
  const db = dbArg === undefined ? getDb() : dbArg;
  const businessDate = businessDateOf(now);
  if (!db) return { businessDate, alreadyDone: true, archived: 0, reports: [] };

  const last = await db.get<string>(`${PATHS.meta}/lastResetDate`);
  const orders = normalizeOrders(await db.get(PATHS.orders));
  const stale = orders.filter((o) => o.businessDate !== businessDate);

  if (last === businessDate && stale.length === 0) {
    return { businessDate, alreadyDone: true, archived: 0, reports: [] };
  }

  const byDate = new Map<string, Order[]>();
  for (const order of stale) byDate.set(order.businessDate, [...(byDate.get(order.businessDate) ?? []), order]);

  for (const [date, list] of byDate) {
    const archivePatch: Record<string, unknown> = {};
    for (const order of list) archivePatch[order.id] = order;
    await db.update(`${PATHS.archive}/${date}`, archivePatch);
    const archived = normalizeOrders(await db.get(`${PATHS.archive}/${date}`));
    await db.set(`${PATHS.reports}/${date}`, summarizeDay(date, archived, now));
    const removal: Record<string, null> = {};
    for (const order of list) removal[order.id] = null;
    await db.update(PATHS.orders, removal);
  }

  // Retenção do arquivo e limpeza de contadores antigos.
  const cutoff = shiftDate(businessDate, -ARCHIVE_RETENTION_DAYS);
  const archiveDates = Object.keys((await db.get<Record<string, unknown>>(PATHS.archive)) ?? {});
  const archiveRemoval: Record<string, null> = {};
  for (const date of archiveDates) if (date < cutoff) archiveRemoval[date] = null;
  if (Object.keys(archiveRemoval).length) await db.update(PATHS.archive, archiveRemoval);

  const counterDates = Object.keys((await db.get<Record<string, unknown>>(PATHS.counters)) ?? {});
  const counterRemoval: Record<string, null> = {};
  for (const date of counterDates) if (date < businessDate) counterRemoval[date] = null;
  if (Object.keys(counterRemoval).length) await db.update(PATHS.counters, counterRemoval);

  await db.remove(`${PATHS.security}/nonces`);
  await db.remove(`${PATHS.security}/rate`);
  await db.set(`${PATHS.meta}/lastResetDate`, businessDate);

  return { businessDate, alreadyDone: false, archived: stale.length, reports: [...byDate.keys()].sort() };
}
