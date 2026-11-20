import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { __createCaptchaForTest, CAPTCHA_TTL_MS, createCaptcha, verifyCaptcha } from './captcha';
import { hashPassword, verifyPassword } from './password';
import { createSessionToken, verifySessionToken } from './session';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';

describe('CAPTCHA', () => {
  it('aceita a resposta certa e recusa a errada', () => {
    const token = __createCaptchaForTest(SECRET, 21);
    expect(verifyCaptcha(SECRET, token, '21')).toMatchObject({ ok: true });
    expect(verifyCaptcha(SECRET, token, ' 21 ')).toMatchObject({ ok: true });
    expect(verifyCaptcha(SECRET, token, '22')).toEqual({ ok: false, reason: 'wrong' });
    expect(verifyCaptcha(SECRET, token, 'abc')).toEqual({ ok: false, reason: 'wrong' });
  });

  it('expira e não aceita outro segredo nem token adulterado', () => {
    const now = Date.now();
    const token = __createCaptchaForTest(SECRET, 9, now);
    expect(verifyCaptcha(SECRET, token, 9, now + CAPTCHA_TTL_MS + 1)).toEqual({ ok: false, reason: 'expired' });
    expect(verifyCaptcha('outro-segredo-com-mais-de-32-caracteres!!', token, 9)).toEqual({ ok: false, reason: 'wrong' });
    const [payload, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ v: 1, n: 'x', e: now + 10 ** 9 })).toString('base64url');
    expect(verifyCaptcha(SECRET, `${forged}.${signature}`, 9).ok).toBe(false);
    expect(verifyCaptcha(SECRET, `${payload}`, 9)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('desenha a conta sem texto legível no SVG', () => {
    const challenge = createCaptcha(SECRET);
    expect(challenge.svg.startsWith('<svg')).toBe(true);
    expect(challenge.svg).not.toContain('<text');
    expect(challenge.token.split('.')).toHaveLength(2);
  });
});

describe('senha', () => {
  it('verifica o hash gerado', async () => {
    const hash = await hashPassword('senha-forte-123');
    expect(hash.startsWith('scrypt:16384:8:1:')).toBe(true);
    expect(hash).not.toContain('$');
    await expect(verifyPassword('senha-forte-123', hash)).resolves.toBe(true);
    await expect(verifyPassword('senha-errada-123', hash)).resolves.toBe(false);
    await expect(verifyPassword('qualquer', 'formato-invalido')).resolves.toBe(false);
  });

  it('é compatível com o script yarn admin:hash', async () => {
    const script = resolve(process.cwd(), 'scripts', 'hash-password.mjs');
    const hash = execFileSync(process.execPath, [script, 'senha-do-script-123'], { encoding: 'utf8' }).trim();
    await expect(verifyPassword('senha-do-script-123', hash)).resolves.toBe(true);
  });
});

describe('sessão', () => {
  it('assina e valida o token do painel', async () => {
    const token = await createSessionToken(SECRET, 'admin@srburger.com.br');
    await expect(verifySessionToken(SECRET, token)).resolves.toMatchObject({ sub: 'admin@srburger.com.br' });
    await expect(verifySessionToken('outro-segredo-com-mais-de-32-caracteres!!', token)).resolves.toBeNull();
    await expect(verifySessionToken(SECRET, `${token}x`)).resolves.toBeNull();
    await expect(verifySessionToken(SECRET, undefined)).resolves.toBeNull();
  });
});
