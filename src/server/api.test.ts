import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { businessDateOf, shiftDate } from '@/lib/schedule';
import { createApp } from './app';
import { createMemoryDb, type Db } from './data/db';
import { PATHS, setDbForTests } from './data/repo';
import { resetServerEnvForTests } from './env';
import { __createCaptchaForTest } from './security/captcha';
import { hashPassword } from './security/password';
import { resetInitializationCacheForTests } from './services/catalog';
import { runDailyReset } from './services/reset';

const SECRET = 'segredo-de-sessao-para-testes-com-32+caracteres';
const EMAIL = 'admin@srburger.com.br';
const PASSWORD = 'senha-de-teste-forte';

let server: Server;
let base: string;
let db: Db;

async function api(path: string, init: RequestInit & { json?: unknown; cookie?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  if (init.cookie) headers.set('cookie', init.cookie);
  const res = await fetch(`${base}${path}`, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  return { status: res.status, body, headers: res.headers };
}

const validOrder = {
  customer: { name: 'Maria Souza', phone: '(11) 98765-4321' },
  fulfillment: { type: 'delivery', address: { street: 'Rua das Flores', number: '120', district: 'Centro' } },
  payment: { method: 'cash', changeFor: 10000 },
  items: [
    { productId: 'sr-salad-bacon', quantity: 2, note: 'sem tomate' },
    { productId: 'pepsi-200ml', quantity: 1 },
  ],
};

async function adminCookie(): Promise<string> {
  const token = __createCaptchaForTest(SECRET, 12);
  const res = await api('/api/auth/login', { method: 'POST', json: { email: EMAIL, password: PASSWORD, captchaToken: token, captchaAnswer: '12' } });
  expect(res.status).toBe(200);
  const cookie = res.headers.get('set-cookie') ?? '';
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Strict');
  return cookie.split(';')[0] ?? '';
}

beforeAll(async () => {
  process.env.SESSION_SECRET = SECRET;
  process.env.ADMIN_EMAIL = EMAIL;
  process.env.ADMIN_PASSWORD_HASH = await hashPassword(PASSWORD);
  process.env.CRON_SECRET = 'cron-secreto';
  process.env.DATA_DRIVER = 'local';
  resetServerEnvForTests();
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  setDbForTests(undefined);
});

beforeEach(async () => {
  db = createMemoryDb();
  setDbForTests(db);
  resetInitializationCacheForTests();
  await api('/api/menu');
  // A SR Burguer é só delivery; a retirada fica ligada aqui para cobrir os dois tipos de pedido.
  await db.update(PATHS.settings, { mode: 'open', deliveryFee: 500, acceptsPickup: true });
});

describe('API pública', () => {
  it('serve o cardápio inicial e grava no banco vazio', async () => {
    const res = await api('/api/menu');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.catalog.products)).toHaveLength(11);
    expect(await db.get('meta/initializedAt')).toBeTypeOf('number');
  });

  it('cria pedidos com número sequencial e preço do servidor', async () => {
    const first = await api('/api/orders', { method: 'POST', json: validOrder });
    expect(first.status).toBe(201);
    expect(first.body.order).toMatchObject({ number: 1, status: 'novo', subtotal: 6598, deliveryFee: 500, total: 7098 });
    expect(first.body.order.customer.phone).toBe('11987654321');
    const second = await api('/api/orders', { method: 'POST', json: { ...validOrder, fulfillment: { type: 'pickup' }, payment: { method: 'pix' } } });
    expect(second.body.order).toMatchObject({ number: 2, deliveryFee: 0, total: 6598 });
  });

  it('recusa retirada quando a loja atende só por delivery', async () => {
    await db.update(PATHS.settings, { acceptsPickup: false });
    const res = await api('/api/orders', { method: 'POST', json: { ...validOrder, fulfillment: { type: 'pickup' }, payment: { method: 'pix' } } });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'pickup_paused' });
  });

  it('recusa pedido com a loja fechada, troco menor que o total e dados inválidos', async () => {
    await db.update(PATHS.settings, { mode: 'closed' });
    expect((await api('/api/orders', { method: 'POST', json: validOrder })).body.code).toBe('store_closed');
    await db.update(PATHS.settings, { mode: 'open' });
    const lowChange = await api('/api/orders', { method: 'POST', json: { ...validOrder, payment: { method: 'cash', changeFor: 1000 } } });
    expect(lowChange.status).toBe(400);
    expect(lowChange.body.fields.changeFor).toBeDefined();
    const invalid = await api('/api/orders', { method: 'POST', json: { ...validOrder, customer: { name: 'A', phone: '123' } } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.fields['customer.name']).toBe('Escreva seu nome completo');
  });

  it('limita pedidos em sequência do mesmo IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await api('/api/orders', { method: 'POST', json: validOrder })).status);
    expect(statuses.slice(0, 6).every((s) => s === 201)).toBe(true);
    expect(statuses[6]).toBe(429);
  });

  it('bloqueia escrita vinda de outra origem', async () => {
    const res = await api('/api/orders', { method: 'POST', json: validOrder, headers: { origin: 'https://site-malicioso.example' } });
    expect(res.status).toBe(403);
  });

  it('informa o status da loja', async () => {
    const res = await api('/api/store/status');
    expect(res.body.status.isOpen).toBe(true);
    expect(res.body.title).toBe('Aberto agora');
  });

  it('pede a bebida dos combos e grava a escolha no pedido', async () => {
    const base = { ...validOrder, fulfillment: { type: 'pickup' }, payment: { method: 'pix' } };
    const missing = await api('/api/orders', { method: 'POST', json: { ...base, items: [{ productId: 'combo-sr-burguer', quantity: 1 }] } });
    expect(missing.status).toBe(409);
    expect(missing.body).toMatchObject({ code: 'pricing', error: 'Escolha a bebida do Combo SR Burguer.' });

    const ok = await api('/api/orders', {
      method: 'POST',
      json: { ...base, items: [{ productId: 'combo-sr-burguer', quantity: 2, drinkId: 'pepsi-200ml' }, { productId: 'sr-burguer', quantity: 1 }] },
    });
    expect(ok.status).toBe(201);
    expect(ok.body.order.items[0]).toMatchObject({ quantity: 2, total: 6998, drink: { id: 'pepsi-200ml', name: 'Pepsi 200 ml' } });
    expect(ok.body.order.items[1].drink).toBeUndefined();
  });

  it('acompanha o pedido só com o código certo e sem dados pessoais', async () => {
    const cookie = await adminCookie();
    const { order } = (await api('/api/orders', { method: 'POST', json: validOrder })).body;
    expect(order.trackToken).toMatch(/^[\w-]{24}$/);

    const tracked = await api(`/api/orders/${order.id}/tracking?t=${order.trackToken}`);
    expect(tracked.status).toBe(200);
    expect(tracked.headers.get('cache-control')).toContain('no-store');
    expect(tracked.body.tracking).toMatchObject({ id: order.id, number: order.number, status: 'novo', fulfillment: 'delivery' });
    expect(JSON.stringify(tracked.body)).not.toMatch(/Maria|98765|Rua das Flores|trackToken/);

    const wrong = await api(`/api/orders/${order.id}/tracking?t=${'x'.repeat(24)}`);
    expect(wrong.status).toBe(404);
    expect((await api(`/api/orders/${order.id}/tracking`)).status).toBe(404);
    expect((await api(`/api/orders/nao-existe-123/tracking?t=${order.trackToken}`)).status).toBe(404);

    await api(`/api/admin/orders/${order.id}/status`, { method: 'PATCH', cookie, json: { status: 'preparando' } });
    const after = await api(`/api/orders/${order.id}/tracking?t=${order.trackToken}`);
    expect(after.body.tracking.status).toBe('preparando');
    expect(after.body.tracking.statusHistory.preparando).toBeTypeOf('number');
  });
});

describe('autenticação do painel', () => {
  it('exige sessão nas rotas do painel', async () => {
    expect((await api('/api/admin/bootstrap')).status).toBe(401);
  });

  it('gera CAPTCHA em SVG', async () => {
    const res = await api('/api/auth/captcha');
    expect(res.body.image.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('recusa CAPTCHA errado, reaproveitado e senha errada; bloqueia após 5 falhas', async () => {
    const wrong = await api('/api/auth/login', {
      method: 'POST',
      json: { email: EMAIL, password: PASSWORD, captchaToken: __createCaptchaForTest(SECRET, 5), captchaAnswer: '6' },
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.fields.captchaAnswer).toContain('incorreta');

    const token = __createCaptchaForTest(SECRET, 7);
    const badPassword = await api('/api/auth/login', { method: 'POST', json: { email: EMAIL, password: 'errada', captchaToken: token, captchaAnswer: '7' } });
    expect(badPassword.status).toBe(401);
    const reused = await api('/api/auth/login', { method: 'POST', json: { email: EMAIL, password: PASSWORD, captchaToken: token, captchaAnswer: '7' } });
    expect(reused.body.error).toContain('já foi usado');

    for (let i = 0; i < 2; i++) {
      await api('/api/auth/login', {
        method: 'POST',
        json: { email: EMAIL, password: 'errada', captchaToken: __createCaptchaForTest(SECRET, 3), captchaAnswer: '3' },
      });
    }
    const locked = await api('/api/auth/login', {
      method: 'POST',
      json: { email: EMAIL, password: PASSWORD, captchaToken: __createCaptchaForTest(SECRET, 3), captchaAnswer: '3' },
    });
    expect(locked.status).toBe(429);
  });

  it('faz login, carrega o painel e atualiza o status de um pedido', async () => {
    const cookie = await adminCookie();
    const order = (await api('/api/orders', { method: 'POST', json: validOrder })).body.order;
    const session = await api('/api/auth/session', { cookie });
    expect(session.body).toMatchObject({ authenticated: true, email: EMAIL, realtime: 'polling', tutorialCompleted: false });

    const boot = await api('/api/admin/bootstrap', { cookie });
    expect(boot.status).toBe(200);
    expect(boot.body.orders).toHaveLength(1);

    const updated = await api(`/api/admin/orders/${order.id}/status`, { method: 'PATCH', cookie, json: { status: 'preparando' } });
    expect(updated.body.order.status).toBe('preparando');
    expect(updated.body.order.statusHistory.preparando).toBeTypeOf('number');
  });

  it('gerencia cardápio, promoção e loja', async () => {
    const cookie = await adminCookie();
    const created = await api('/api/admin/catalog/products', {
      method: 'POST',
      cookie,
      json: { categoryId: 'lanches', name: 'Lanche da Casa', description: 'Teste', price: 2990, available: true, featured: false },
    });
    expect(created.status).toBe(201);
    const id = created.body.product.id as string;

    const promo = await api(`/api/admin/catalog/products/${id}/promo`, { method: 'PATCH', cookie, json: { promoPrice: 1990, durationMinutes: 60 } });
    expect(promo.body.product.promoEndsAt).toBeGreaterThan(Date.now());
    const badPromo = await api(`/api/admin/catalog/products/${id}/promo`, { method: 'PATCH', cookie, json: { promoPrice: 5000, durationMinutes: null } });
    expect(badPromo.status).toBe(400);

    const order = await api('/api/orders', { method: 'POST', json: { ...validOrder, items: [{ productId: id, quantity: 1 }], payment: { method: 'pix' } } });
    expect(order.body.order.subtotal).toBe(1990);

    expect((await api(`/api/admin/catalog/products/${id}/availability`, { method: 'PATCH', cookie, json: { available: false } })).status).toBe(200);
    const paused = await api('/api/orders', { method: 'POST', json: { ...validOrder, items: [{ productId: id, quantity: 1 }], payment: { method: 'pix' } } });
    expect(paused.status).toBe(409);

    expect((await api('/api/admin/catalog/categories/lanches', { method: 'DELETE', cookie })).status).toBe(409);
    expect((await api(`/api/admin/catalog/products/${id}`, { method: 'DELETE', cookie })).status).toBe(200);

    const mode = await api('/api/admin/settings/mode', { method: 'PATCH', cookie, json: { mode: 'closed' } });
    expect(mode.body.mode).toBe('closed');
  });
});

describe('fechamento diário', () => {
  it('cron exige o segredo', async () => {
    expect((await api('/api/cron/reset')).status).toBe(401);
    const ok = await api('/api/cron/reset', { headers: { authorization: 'Bearer cron-secreto' } });
    expect(ok.body.ok).toBe(true);
  });

  it('arquiva pedidos de dias anteriores, gera resumo e é idempotente', async () => {
    const now = Date.now();
    const today = businessDateOf(now);
    const yesterday = shiftDate(today, -1);
    const order = (await api('/api/orders', { method: 'POST', json: validOrder })).body.order;
    await db.update(`${PATHS.orders}/${order.id}`, { businessDate: yesterday });
    await db.set(`${PATHS.archive}/${shiftDate(today, -40)}/velho`, { id: 'velho' });

    const result = await runDailyReset(now, db);
    expect(result).toMatchObject({ businessDate: today, alreadyDone: false, archived: 1, reports: [yesterday] });
    expect(await db.get(`${PATHS.orders}/${order.id}`)).toBeNull();
    expect(await db.get(`${PATHS.archive}/${yesterday}/${order.id}`)).not.toBeNull();
    expect(await db.get(`${PATHS.reports}/${yesterday}`)).toMatchObject({ orders: 1, revenue: 7098 });
    expect(await db.get(`${PATHS.archive}/${shiftDate(today, -40)}`)).toBeNull();

    expect((await runDailyReset(now, db)).alreadyDone).toBe(true);
  });
});
