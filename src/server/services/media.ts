import { getDb, PATHS } from '../data/repo';
import { HttpError, notConfigured } from '../http-error';

/**
 * Imagens enviadas pelo painel ficam no próprio Realtime Database (base64), já reduzidas no navegador.
 * O Cloud Storage do Firebase exige o plano Blaze; assim o projeto segue no plano gratuito.
 * São servidas por /api/media/:id com cache imutável, então a CDN absorve as leituras.
 */

export const MAX_MEDIA_BYTES = 900 * 1024;

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

interface StoredMedia {
  mime: string;
  data: string;
  size: number;
  createdAt: number;
}

export async function saveMedia(dataUrl: string, now = Date.now()): Promise<string> {
  const db = getDb();
  if (!db) throw notConfigured();
  const match = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new HttpError(400, 'Formato de imagem inválido.');
  const mime = match[1] as string;
  const data = match[2] as string;
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length > MAX_MEDIA_BYTES) throw new HttpError(413, 'Imagem muito grande. Use uma foto menor que 900 KB.');
  if (!SIGNATURES[mime]?.(bytes)) throw new HttpError(400, 'O arquivo não corresponde ao tipo de imagem informado.');
  const id = db.newId();
  const record: StoredMedia = { mime, data, size: bytes.length, createdAt: now };
  await db.set(`${PATHS.media}/${id}`, record);
  return `/api/media/${id}`;
}

export async function getMedia(id: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!/^[\w-]{6,40}$/.test(id)) return null;
  const db = getDb();
  if (!db) return null;
  const record = await db.get<StoredMedia>(`${PATHS.media}/${id}`);
  if (!record?.data || !record.mime) return null;
  return { mime: record.mime, bytes: Buffer.from(record.data, 'base64') };
}

export async function deleteMediaByUrl(url: string | null | undefined): Promise<void> {
  const match = url ? /^\/api\/media\/([\w-]+)$/.exec(url) : null;
  if (!match) return;
  const db = getDb();
  if (db) await db.remove(`${PATHS.media}/${match[1]}`);
}
