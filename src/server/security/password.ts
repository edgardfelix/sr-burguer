import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Hash de senha com scrypt (nativo do Node, sem dependências).
 * Formato: scrypt:N:r:p:salt:hash (base64url, sem "$" para não sofrer expansão no .env).
 * Mantenha em sincronia com scripts/hash-password.mjs.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${N}:${R}:${P}:${salt.toString('base64url')}:${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.trim().split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nRaw, rRaw, pRaw, saltRaw, keyRaw] = parts as [string, string, string, string, string, string];
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (![n, r, p].every(Number.isInteger) || n < 1024 || n > 1_048_576) return false;
  const salt = Buffer.from(saltRaw, 'base64url');
  const expected = Buffer.from(keyRaw, 'base64url');
  if (salt.length < 8 || expected.length < 32) return false;
  const actual = await derive(password, salt, expected.length, { N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
