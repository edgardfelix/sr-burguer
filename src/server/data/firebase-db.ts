import type { App } from 'firebase-admin/app';
import type { Database } from 'firebase-admin/database';
import type { FirebaseAdminConfig } from '../env';
import { cleanForDb, generatePushId, type Db } from './db';

/**
 * O firebase-admin é carregado sob demanda e em sequência (await por módulo):
 *  - no modo local ele nem chega a carregar;
 *  - evita a corrida de require(esm) do Node 22+ entre firebase-admin/auth (jwks-rsa -> jose)
 *    e outros módulos importados em paralelo.
 */
const APP_NAME = 'srburguer-admin';

let appPromise: Promise<App> | null = null;
let databasePromise: Promise<Database> | null = null;

function getFirebaseAdminApp(config: FirebaseAdminConfig): Promise<App> {
  appPromise ??= (async () => {
    const { cert, getApp, getApps, initializeApp } = await import('firebase-admin/app');
    if (getApps().some((a) => a.name === APP_NAME)) return getApp(APP_NAME);
    return initializeApp(
      {
        credential: cert({ projectId: config.projectId, clientEmail: config.clientEmail, privateKey: config.privateKey }),
        databaseURL: config.databaseURL,
        projectId: config.projectId,
      },
      APP_NAME,
    );
  })();
  return appPromise;
}

function getAdminDatabase(config: FirebaseAdminConfig): Promise<Database> {
  databasePromise ??= (async () => {
    const app = await getFirebaseAdminApp(config);
    const { getDatabase } = await import('firebase-admin/database');
    return getDatabase(app);
  })();
  return databasePromise;
}

export function createFirebaseDb(config: FirebaseAdminConfig): Db {
  const ref = async (path: string) => (await getAdminDatabase(config)).ref(path);
  return {
    kind: 'firebase',
    async get<T>(path: string) {
      const snapshot = await (await ref(path)).get();
      return snapshot.exists() ? (snapshot.val() as T) : null;
    },
    async set(path, value) {
      const cleaned = cleanForDb(value);
      const target = await ref(path);
      if (cleaned === undefined) await target.remove();
      else await target.set(cleaned);
    },
    async update(path, patch) {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        const v = cleanForDb(value, true);
        cleaned[key] = v === undefined ? null : v;
      }
      await (await ref(path)).update(cleaned);
    },
    async remove(path) {
      await (await ref(path)).remove();
    },
    async transaction<T>(path: string, fn: (current: T | null) => T | null | undefined) {
      const result = await (await ref(path)).transaction((current: T | null) => {
        const next = fn(current);
        return next === undefined ? undefined : (cleanForDb(next) ?? null);
      });
      return { committed: result.committed, value: (result.snapshot.val() as T | null) ?? null };
    },
    // Mesmo algoritmo do push() do Firebase, gerado localmente (ordenado no tempo).
    newId: () => generatePushId(),
  };
}

/** Custom token com a claim admin: libera a leitura de pedidos pelas regras do RTDB. */
export async function createAdminCustomToken(config: FirebaseAdminConfig, uid: string): Promise<string> {
  const app = await getFirebaseAdminApp(config);
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth(app).createCustomToken(uid, { admin: true });
}
