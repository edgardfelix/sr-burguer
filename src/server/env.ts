import { firebasePublicConfig, isFirebasePublicConfigured, isValidDatabaseUrl } from '@/lib/firebase-public';

export type DataDriver = 'firebase' | 'local' | 'none';

export interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseURL: string;
}

export interface ServerEnv {
  isProduction: boolean;
  isVercel: boolean;
  adminEmail: string;
  adminPasswordHash: string | null;
  sessionSecret: string | null;
  cronSecret: string | null;
  driver: DataDriver;
  firebaseAdmin: FirebaseAdminConfig | null;
  firebaseClientReady: boolean;
  problems: string[];
}

const DEV_SESSION_SECRET = 'dev-only-sr-burguer-session-secret-nao-use-em-producao';

function readServiceAccount(): Omit<FirebaseAdminConfig, 'databaseURL'> | null {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (base64) {
    try {
      const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (json.project_id && json.client_email && json.private_key) {
        return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key };
      }
    } catch {
      /* cai para os campos separados */
    }
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? '';
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();
  const projectId = firebasePublicConfig.projectId.trim();
  if (clientEmail.includes('@') && privateKey.includes('BEGIN PRIVATE KEY') && projectId) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

let cached: ServerEnv | null = null;

/** Apenas para testes: força a releitura das variáveis. */
export function resetServerEnvForTests(): void {
  cached = null;
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = Boolean(process.env.VERCEL);
  const problems: string[] = [];

  const account = readServiceAccount();
  const databaseURL = firebasePublicConfig.databaseURL.trim();
  const firebaseAdmin = account && isValidDatabaseUrl(databaseURL) ? { ...account, databaseURL } : null;

  const requested = (process.env.DATA_DRIVER ?? '').trim().toLowerCase();
  let driver: DataDriver;
  if (requested === 'firebase') {
    driver = firebaseAdmin ? 'firebase' : 'none';
    if (!firebaseAdmin) problems.push('DATA_DRIVER=firebase, mas a conta de serviço ou a DATABASE_URL não estão configuradas.');
  } else if (requested === 'local') {
    driver = isVercel ? 'none' : 'local';
    if (isVercel) problems.push('DATA_DRIVER=local não funciona na Vercel (disco temporário). Configure o Firebase.');
  } else {
    driver = firebaseAdmin ? 'firebase' : !isProduction && !isVercel ? 'local' : 'none';
  }
  if (driver === 'none') problems.push('Banco de dados não configurado: o cardápio usa os dados iniciais e pedidos ficam bloqueados.');

  let sessionSecret = process.env.SESSION_SECRET?.trim() || null;
  if (sessionSecret && sessionSecret.length < 32) {
    problems.push('SESSION_SECRET precisa de pelo menos 32 caracteres.');
    sessionSecret = null;
  }
  if (!sessionSecret && !isProduction) sessionSecret = DEV_SESSION_SECRET;
  if (!sessionSecret) problems.push('SESSION_SECRET ausente: o login do painel fica desativado.');

  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  if (!adminPasswordHash) problems.push('ADMIN_PASSWORD_HASH ausente: gere com yarn admin:hash.');

  const firebaseClientReady = isFirebasePublicConfigured();
  if (driver === 'firebase' && !firebaseClientReady) {
    problems.push('Variáveis NEXT_PUBLIC_FIREBASE_* incompletas: o painel não recebe pedidos em tempo real.');
  }

  cached = {
    isProduction,
    isVercel,
    adminEmail: (process.env.ADMIN_EMAIL ?? 'admin@srburger.com.br').trim().toLowerCase(),
    adminPasswordHash,
    sessionSecret,
    cronSecret: process.env.CRON_SECRET?.trim() || null,
    driver,
    firebaseAdmin,
    firebaseClientReady,
    problems,
  };
  if (problems.length) console.warn(`[srburguer] Configuração: ${problems.join(' | ')}`);
  return cached;
}
