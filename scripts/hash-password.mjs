#!/usr/bin/env node
/**
 * Gera o valor de ADMIN_PASSWORD_HASH para o .env e para a Vercel.
 * Uso: yarn admin:hash "sua-senha"
 * Formato idêntico ao de src/server/security/password.ts.
 */
import { randomBytes, scrypt } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Uso: yarn admin:hash "sua-senha"');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Use uma senha com pelo menos 10 caracteres.');
  process.exit(1);
}

const N = 16384;
const r = 8;
const p = 1;
const salt = randomBytes(16);

scrypt(password.normalize('NFKC'), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`scrypt:${N}:${r}:${p}:${salt.toString('base64url')}:${key.toString('base64url')}`);
});
