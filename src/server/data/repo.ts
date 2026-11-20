import { getServerEnv } from '../env';
import type { Db } from './db';
import { createFirebaseDb } from './firebase-db';
import { createLocalDb } from './local-db';

export { asRecord, normalizeCatalog, normalizeOrder, normalizeOrders, normalizeReports, normalizeSettings } from '@/lib/normalize';

export const PATHS = {
  categories: 'catalog/categories',
  products: 'catalog/products',
  settings: 'settings',
  orders: 'orders',
  archive: 'archive',
  reports: 'reports',
  meta: 'meta',
  counters: 'meta/orderCounters',
  media: 'media',
  security: 'security',
} as const;

let instance: Db | null | undefined;

/** Banco configurado, ou null quando não há driver (cardápio só leitura com dados iniciais). */
export function getDb(): Db | null {
  if (instance !== undefined) return instance;
  const env = getServerEnv();
  if (env.driver === 'firebase' && env.firebaseAdmin) instance = createFirebaseDb(env.firebaseAdmin);
  else if (env.driver === 'local') instance = createLocalDb();
  else instance = null;
  return instance;
}

/** Apenas para testes. */
export function setDbForTests(db: Db | null | undefined): void {
  instance = db;
}
