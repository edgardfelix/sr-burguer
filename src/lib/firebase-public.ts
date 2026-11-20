/**
 * Configuração pública do Firebase (vai para o navegador do painel).
 * Cada variável é lida de forma literal para o Next.js embutir no build.
 */
export const firebasePublicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

const DATABASE_URL = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(firebaseio\.com|firebasedatabase\.app)\/?$/i;

export function isValidDatabaseUrl(url: string): boolean {
  return DATABASE_URL.test(url.trim());
}

/** Placeholders do .env (ex.: "sua_api_key") não contam como configuração. */
export function isFirebasePublicConfigured(config = firebasePublicConfig): boolean {
  return (
    /^AIza[\w-]{20,}$/.test(config.apiKey.trim()) &&
    isValidDatabaseUrl(config.databaseURL) &&
    /^[a-z0-9-]{4,}$/.test(config.projectId.trim()) &&
    config.appId.trim().length > 10
  );
}
