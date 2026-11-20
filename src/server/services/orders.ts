import { randomBytes, timingSafeEqual } from 'node:crypto';
import { formatBRL } from '@/lib/money';
import { OrderPricingError, priceOrder } from '@/lib/order';
import { businessDateOf, computeStoreStatus, describeStatus } from '@/lib/schedule';
import type { OrderInput } from '@/lib/schemas';
import type { Order, OrderStatus, OrderTracking } from '@/lib/types';
import { getDb, normalizeOrder, normalizeOrders, PATHS } from '../data/repo';
import { HttpError, notConfigured } from '../http-error';
import { loadMenu } from './catalog';

export async function createOrder(input: OrderInput, now = Date.now()): Promise<Order> {
  const db = getDb();
  if (!db) throw notConfigured();
  const { catalog, settings } = await loadMenu();

  const status = computeStoreStatus(settings, now);
  if (!status.isOpen) {
    const { detail } = describeStatus(status, now);
    throw new HttpError(409, `A loja está fechada agora. ${detail}.`, undefined, 'store_closed');
  }
  if (input.fulfillment.type === 'delivery' && !settings.acceptsDelivery) {
    throw new HttpError(409, 'As entregas estão pausadas no momento. Escolha retirada no balcão.', undefined, 'delivery_paused');
  }
  if (input.fulfillment.type === 'pickup' && !settings.acceptsPickup) {
    throw new HttpError(409, 'A retirada no balcão está pausada no momento. Escolha entrega.', undefined, 'pickup_paused');
  }

  let priced;
  try {
    priced = priceOrder(input.items, catalog, settings, input.fulfillment.type, now);
  } catch (error) {
    if (error instanceof OrderPricingError) throw new HttpError(409, error.message, undefined, 'pricing');
    throw error;
  }

  if (input.fulfillment.type === 'delivery' && settings.minOrder > 0 && priced.subtotal < settings.minOrder) {
    throw new HttpError(409, `O pedido mínimo para entrega é ${formatBRL(settings.minOrder)}.`, undefined, 'min_order');
  }

  const changeFor = input.payment.method === 'cash' ? (input.payment.changeFor ?? null) : null;
  if (changeFor !== null && changeFor < priced.total) {
    throw new HttpError(400, 'O valor do troco precisa ser maior que o total do pedido.', { changeFor: 'Informe um valor maior que o total' });
  }

  const businessDate = businessDateOf(now);
  const counter = await db.transaction<number>(`${PATHS.counters}/${businessDate}`, (current) => (current ?? 0) + 1);
  const id = db.newId();
  const order: Order = {
    id,
    number: counter.value ?? 1,
    businessDate,
    createdAt: now,
    updatedAt: now,
    status: 'novo',
    customer: input.customer,
    fulfillment: input.fulfillment.type === 'delivery' ? { type: 'delivery', address: input.fulfillment.address } : { type: 'pickup' },
    payment: { method: input.payment.method, changeFor },
    items: priced.items,
    ...(input.notes ? { notes: input.notes } : {}),
    subtotal: priced.subtotal,
    deliveryFee: priced.deliveryFee,
    total: priced.total,
    statusHistory: { novo: now },
    // 144 bits aleatórios: só quem recebeu a resposta do pedido consegue acompanhar o status.
    trackToken: randomBytes(18).toString('base64url'),
  };
  await db.set(`${PATHS.orders}/${id}`, order);
  return order;
}

const ORDER_ID = /^[\w-]{6,40}$/;
const TRACK_TOKEN = /^[\w-]{16,64}$/;

function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Andamento público de um pedido, liberado pelo código de acompanhamento.
 * Devolve só status e horários (nada de nome, telefone ou endereço).
 * Pedido inexistente, arquivado no fechamento do dia ou código errado: mesma resposta 404.
 */
export async function getOrderTracking(id: string, token: string): Promise<OrderTracking> {
  const notFound = new HttpError(404, 'Pedido não encontrado. Ele pode ter sido encerrado no fechamento do dia.', undefined, 'not_found');
  if (!ORDER_ID.test(id) || !TRACK_TOKEN.test(token)) throw notFound;
  const db = getDb();
  if (!db) throw notConfigured();
  const order = normalizeOrder(id, await db.get(`${PATHS.orders}/${id}`));
  if (!order?.trackToken || !sameToken(order.trackToken, token)) throw notFound;
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    fulfillment: order.fulfillment.type,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    statusHistory: order.statusHistory ?? { novo: order.createdAt },
  };
}

export async function listOrders(businessDate?: string): Promise<Order[]> {
  const db = getDb();
  if (!db) return [];
  const orders = normalizeOrders(await db.get(PATHS.orders));
  return businessDate ? orders.filter((o) => o.businessDate === businessDate) : orders;
}

export async function updateOrderStatus(id: string, status: OrderStatus, now = Date.now()): Promise<Order> {
  const db = getDb();
  if (!db) throw notConfigured();
  const current = normalizeOrder(id, await db.get(`${PATHS.orders}/${id}`));
  if (!current) throw new HttpError(404, 'Pedido não encontrado. Ele pode ter sido arquivado no fechamento do dia.');
  await db.update(`${PATHS.orders}/${id}`, { status, updatedAt: now, [`statusHistory/${status}`]: now });
  return { ...current, status, updatedAt: now, statusHistory: { ...current.statusHistory, [status]: now } };
}
