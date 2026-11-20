'use client';

import type { Database } from 'firebase/database';
import { firebasePublicConfig } from '@/lib/firebase-public';

/**
 * Conexão em tempo real do painel com o Realtime Database.
 * O SDK nunca entra no pacote inicial: é importado sob demanda (os três módulos em paralelo),
 * só no painel e só no modo Firebase. O cardápio público não carrega nada disto.
 * O login usa o custom token emitido pelo servidor com a claim admin, exigida pelas regras do banco.
 */
let databasePromise: Promise<Database> | null = null;

export async function connectRealtime(customToken: string): Promise<Database> {
  databasePromise ??= (async () => {
    const [{ getApps, initializeApp }, { getAuth, signInWithCustomToken }, { getDatabase }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/database'),
    ]);
    const app = getApps()[0] ?? initializeApp(firebasePublicConfig);
    await signInWithCustomToken(getAuth(app), customToken);
    return getDatabase(app);
  })();
  try {
    return await databasePromise;
  } catch (error) {
    databasePromise = null;
    throw error;
  }
}

export interface Listener {
  path: string;
  equalTo?: { child: string; value: string };
  onData: (value: unknown) => void;
  onError?: (error: Error) => void;
}

/** Assina um caminho e devolve a função para cancelar. */
export async function listen(db: Database, { path, equalTo, onData, onError }: Listener): Promise<() => void> {
  const { equalTo: eq, onValue, orderByChild, query, ref } = await import('firebase/database');
  const base = ref(db, path);
  const target = equalTo ? query(base, orderByChild(equalTo.child), eq(equalTo.value)) : base;
  return onValue(target, (snapshot) => onData(snapshot.val()), (error) => onError?.(error));
}

export async function watchConnection(db: Database, onChange: (connected: boolean) => void): Promise<() => void> {
  const { onValue, ref } = await import('firebase/database');
  return onValue(ref(db, '.info/connected'), (snapshot) => onChange(snapshot.val() === true));
}

export async function disconnectRealtime(): Promise<void> {
  if (!databasePromise) return;
  try {
    const { getApps } = await import('firebase/app');
    const { getAuth, signOut } = await import('firebase/auth');
    const app = getApps()[0];
    if (app) await signOut(getAuth(app));
  } finally {
    databasePromise = null;
  }
}
