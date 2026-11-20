import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * CAPTCHA matemático visual.
 * - A conta é desenhada como traços SVG com ruído e distorção por glifo (não há texto no DOM).
 * - O token não contém a resposta: é HMAC(segredo, payload + resposta). Sem estado no servidor.
 * - O nonce do payload é registrado no banco ao ser usado, impedindo reaproveitamento.
 */

export const CAPTCHA_TTL_MS = 5 * 60_000;

export interface CaptchaChallenge {
  token: string;
  svg: string;
  expiresAt: number;
}

export type CaptchaVerification =
  | { ok: true; nonce: string; expiresAt: number }
  | { ok: false; reason: 'malformed' | 'expired' | 'wrong' };

type Point = [number, number];
type Glyph = Point[][];

/** Glifos em grade 10x16, traçados como escrita à mão. */
const GLYPHS: Record<string, Glyph> = {
  '0': [[[5, 0], [8.5, 2], [10, 8], [8.5, 14], [5, 16], [1.5, 14], [0, 8], [1.5, 2], [5, 0]]],
  '1': [[[2, 3.4], [5.6, 0], [5.6, 16]]],
  '2': [[[0.5, 3.5], [2.5, 0.6], [6, 0], [9, 2.2], [9, 5.5], [6, 9], [0.5, 16], [10, 16]]],
  '3': [
    [[0.5, 1.5], [4, 0], [8, 0.8], [9.3, 3.5], [8, 6.5], [4, 7.8]],
    [[4, 7.8], [8.5, 9.2], [9.8, 12.5], [8, 15.2], [4, 16], [0.3, 14.5]],
  ],
  '4': [[[7.5, 16], [7.5, 0], [0, 11], [10, 11]]],
  '5': [[[9, 0], [1.5, 0], [0.8, 7], [4.5, 6], [8.5, 7.5], [10, 11], [8.5, 14.8], [4.5, 16], [0.5, 14.6]]],
  '6': [[[8.5, 1], [5, 0], [1.5, 2.5], [0, 8], [0.5, 13], [3, 15.6], [6.5, 15.8], [9.4, 13], [9.4, 10], [7, 7.5], [4, 7.5], [1, 9.5]]],
  '7': [[[0, 0], [10, 0], [4, 16]], [[3, 8.2], [8, 8.2]]],
  '8': [[[5, 7.6], [1.5, 6], [1, 3], [3, 0.4], [7, 0.4], [9, 3], [8.5, 6], [5, 7.6], [1, 10], [0.4, 13], [2.5, 15.8], [7.5, 15.8], [9.6, 13], [9, 10], [5, 7.6]]],
  '9': [[[9, 6], [7, 8.4], [3, 8.4], [0.6, 6], [0.6, 2.8], [3, 0.3], [7, 0.3], [9.4, 3], [9.4, 8], [8.6, 13], [5.5, 16], [1.5, 15]]],
  '+': [[[5, 3.5], [5, 12.5]], [[0.5, 8], [9.5, 8]]],
  '-': [[[1, 8], [9, 8]]],
  x: [[[1.5, 3.5], [8.5, 12.5]], [[8.5, 3.5], [1.5, 12.5]]],
  '=': [[[1, 5.5], [9, 5.5]], [[1, 10.5], [9, 10.5]]],
  '?': [[[1, 4], [2.5, 0.8], [5.5, 0], [8.5, 1.6], [9, 4.5], [7, 7], [5, 8.5], [5, 11]], [[5, 14.4], [5.1, 15.6]]],
};

const INKS = ['#1B1410', '#7A4410', '#8E2A19'];

function rand(min: number, max: number): number {
  return min + (randomInt(0, 1_000_000) / 1_000_000) * (max - min);
}

function makeProblem(): { text: string; answer: number } {
  const kind = randomInt(0, 3);
  if (kind === 0) {
    const a = randomInt(3, 21);
    const b = randomInt(2, 10);
    return { text: `${a}+${b}`, answer: a + b };
  }
  if (kind === 1) {
    const a = randomInt(9, 26);
    const b = randomInt(1, a - 2);
    return { text: `${a}-${b}`, answer: a - b };
  }
  const a = randomInt(2, 10);
  const b = randomInt(2, 10);
  return { text: `${a}x${b}`, answer: a * b };
}

function renderSvg(expression: string): string {
  const chars = `${expression}=?`.split('');
  const scale = 2.3;
  const advance = 30;
  const gap = 10;
  const width = 24 + chars.reduce((w, c) => w + (/[+\-x=]/.test(c) ? advance + gap : advance), 0);
  const height = 64;
  const parts: string[] = [];
  parts.push(`<rect width="${width}" height="${height}" rx="6" fill="#F7F1E6"/>`);
  for (let i = 0; i < 7; i++) {
    const x = rand(-20, width);
    parts.push(`<path d="M${x.toFixed(1)} ${height}L${(x + rand(30, 70)).toFixed(1)} 0" stroke="#E4D7C2" stroke-width="1"/>`);
  }

  let cursor = 14;
  for (const ch of chars) {
    const glyph = GLYPHS[ch];
    const operator = /[+\-x=]/.test(ch);
    if (operator) cursor += gap / 2;
    if (glyph) {
      const s = scale * rand(0.86, 1.14);
      const rotate = rand(-14, 14);
      const dy = rand(-4, 4);
      const ox = cursor + rand(-2, 2);
      const oy = (height - 16 * s) / 2 + dy;
      const ink = INKS[randomInt(0, INKS.length)] ?? INKS[0];
      const strokeW = rand(2.3, 3.2);
      const d = glyph
        .map((stroke) =>
          stroke
            .map(([px, py], j) => {
              const jx = px + rand(-0.45, 0.45);
              const jy = py + rand(-0.45, 0.45);
              return `${j === 0 ? 'M' : 'L'}${(jx * s).toFixed(1)} ${(jy * s).toFixed(1)}`;
            })
            .join(''),
        )
        .join('');
      const cx = 5 * s;
      const cy = 8 * s;
      parts.push(
        `<g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)}) rotate(${rotate.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"><path d="${d}" fill="none" stroke="${ink}" stroke-width="${strokeW.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></g>`,
      );
    }
    cursor += operator ? advance + gap / 2 : advance;
  }

  for (let i = 0; i < 5; i++) {
    const y1 = rand(8, height - 8);
    const y2 = rand(8, height - 8);
    const c1 = `${rand(width * 0.2, width * 0.45).toFixed(1)} ${rand(0, height).toFixed(1)}`;
    const c2 = `${rand(width * 0.55, width * 0.8).toFixed(1)} ${rand(0, height).toFixed(1)}`;
    const ink = INKS[randomInt(0, INKS.length)] ?? INKS[0];
    parts.push(
      `<path d="M0 ${y1.toFixed(1)}C${c1} ${c2} ${width} ${y2.toFixed(1)}" fill="none" stroke="${ink}" stroke-opacity="${rand(0.25, 0.5).toFixed(2)}" stroke-width="${rand(1, 1.8).toFixed(2)}"/>`,
    );
  }
  for (let i = 0; i < 26; i++) {
    parts.push(
      `<circle cx="${rand(0, width).toFixed(1)}" cy="${rand(0, height).toFixed(1)}" r="${rand(0.7, 1.7).toFixed(1)}" fill="#1B1410" fill-opacity="${rand(0.2, 0.5).toFixed(2)}"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${parts.join('')}</svg>`;
}

function sign(secret: string, payload: string, answer: string): string {
  return createHmac('sha256', secret).update(`${payload}.${answer}`).digest('base64url');
}

function normalizeAnswer(answer: string | number): string | null {
  const n = Number.parseInt(String(answer).trim(), 10);
  return Number.isFinite(n) ? String(n) : null;
}

export function createCaptcha(secret: string, now = Date.now()): CaptchaChallenge {
  const { text, answer } = makeProblem();
  const expiresAt = now + CAPTCHA_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ v: 1, n: randomBytes(12).toString('base64url'), e: expiresAt })).toString('base64url');
  return { token: `${payload}.${sign(secret, payload, String(answer))}`, svg: renderSvg(text), expiresAt };
}

export function verifyCaptcha(secret: string, token: string, answer: string | number, now = Date.now()): CaptchaVerification {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return { ok: false, reason: 'malformed' };
  let data: { v?: number; n?: string; e?: number };
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (data.v !== 1 || typeof data.n !== 'string' || typeof data.e !== 'number') return { ok: false, reason: 'malformed' };
  if (data.e <= now) return { ok: false, reason: 'expired' };
  const normalized = normalizeAnswer(answer);
  if (normalized === null) return { ok: false, reason: 'wrong' };
  const expected = Buffer.from(sign(secret, payload, normalized));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return { ok: false, reason: 'wrong' };
  return { ok: true, nonce: data.n, expiresAt: data.e };
}

/** Exposto apenas para testes: gera um desafio com resposta conhecida. */
export function __createCaptchaForTest(secret: string, answer: number, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ v: 1, n: randomBytes(12).toString('base64url'), e: now + CAPTCHA_TTL_MS })).toString('base64url');
  return `${payload}.${sign(secret, payload, String(answer))}`;
}
