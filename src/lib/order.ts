import { drinkChoiceFor, effectivePrice } from './catalog';
import type { Catalog, Cents, FulfillmentType, OrderItem, OrderStatus, PaymentMethod, StoreSettings } from './types';

export const MAX_QUANTITY_PER_ITEM = 30;
export const MAX_LINES_PER_ORDER = 40;

export interface CartLineInput {
  productId: string;
  quantity: number;
  note?: string;
  /** Bebida escolhida para o combo (id de um item marcado como bebida de combo). */
  drinkId?: string;
}

export interface PricedOrder {
  items: OrderItem[];
  subtotal: Cents;
  deliveryFee: Cents | null;
  total: Cents;
}

export class OrderPricingError extends Error {
  constructor(
    message: string,
    public readonly productId?: string,
  ) {
    super(message);
    this.name = 'OrderPricingError';
  }
}

/** Chave de agrupamento: mesmo item, mesma bebida e mesma observação viram uma linha só. */
export function cartLineKey(productId: string, note?: string, drinkId?: string): string {
  return `${productId}::${drinkId ?? ''}::${(note ?? '').trim().toLowerCase()}`;
}

/**
 * Calcula o pedido a partir do cardápio atual (o preço do navegador nunca é confiável).
 * Linhas iguais (mesmo item, mesma bebida e mesma observação) são somadas.
 * A bebida do combo é conferida aqui: precisa estar entre as opções disponíveis agora.
 */
export function priceOrder(
  lines: CartLineInput[],
  catalog: Catalog,
  settings: Pick<StoreSettings, 'deliveryFee'>,
  fulfillment: FulfillmentType,
  now: number,
): PricedOrder {
  if (lines.length === 0) throw new OrderPricingError('O pedido está vazio.');
  if (lines.length > MAX_LINES_PER_ORDER) throw new OrderPricingError('Pedido com itens demais.');

  const merged = new Map<string, CartLineInput>();
  for (const line of lines) {
    const note = line.note?.trim() || undefined;
    const drinkId = line.drinkId || undefined;
    const key = cartLineKey(line.productId, note, drinkId);
    const prev = merged.get(key);
    merged.set(key, { productId: line.productId, note, drinkId, quantity: (prev?.quantity ?? 0) + line.quantity });
  }

  const items: OrderItem[] = [];
  for (const line of merged.values()) {
    const product = catalog.products[line.productId];
    if (!product) throw new OrderPricingError('Um dos itens não existe mais no cardápio.', line.productId);
    const category = catalog.categories[product.categoryId];
    if (!product.available || (category && !category.active)) {
      throw new OrderPricingError(`${product.name} está indisponível no momento.`, product.id);
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_ITEM) {
      throw new OrderPricingError(`Quantidade inválida para ${product.name}.`, product.id);
    }

    let drink: OrderItem['drink'];
    const choice = drinkChoiceFor(product, catalog);
    if (choice && line.drinkId) {
      const option = choice.options.find((o) => o.id === line.drinkId);
      if (!option) throw new OrderPricingError(`A bebida escolhida para ${product.name} acabou. Escolha outra.`, product.id);
      drink = { id: option.id, name: option.name };
    } else if (choice?.mode === 'required') {
      throw new OrderPricingError(`Escolha a bebida do ${product.name}.`, product.id);
    }

    const unitPrice = effectivePrice(product, now);
    items.push({
      productId: product.id,
      name: product.name,
      unitPrice,
      quantity: line.quantity,
      ...(line.note ? { note: line.note } : {}),
      ...(drink ? { drink } : {}),
      total: unitPrice * line.quantity,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = fulfillment === 'delivery' ? settings.deliveryFee : 0;
  const total = subtotal + (deliveryFee ?? 0);
  return { items, subtotal, deliveryFee, total };
}

export function formatOrderNumber(n: number): string {
  return `#${String(n).padStart(4, '0')}`;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  card: 'Cartão na maquininha',
  cash: 'Dinheiro',
};

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  delivery: 'Entrega',
  pickup: 'Retirada no balcão',
};

/** Rótulo do status no painel, ajustado ao tipo de pedido. */
export function statusLabel(status: OrderStatus, fulfillment: FulfillmentType): string {
  switch (status) {
    case 'novo':
      return 'Novo';
    case 'preparando':
      return 'Em preparo';
    case 'despachado':
      return fulfillment === 'delivery' ? 'Saiu para entrega' : 'Pronto para retirada';
    case 'concluido':
      return 'Concluído';
    case 'cancelado':
      return 'Cancelado';
  }
}

/** Etapas mostradas ao cliente no acompanhamento (cancelado é tratado à parte). */
export const TRACKING_STEPS = ['novo', 'preparando', 'despachado', 'concluido'] as const satisfies readonly OrderStatus[];

/** Andamento do pedido nas palavras de quem pediu. */
export function trackingLabel(status: OrderStatus, fulfillment: FulfillmentType): string {
  switch (status) {
    case 'novo':
      return 'Pedido recebido';
    case 'preparando':
      return 'Em preparo';
    case 'despachado':
      return fulfillment === 'delivery' ? 'Saiu para entrega' : 'Pronto para retirada';
    case 'concluido':
      return fulfillment === 'delivery' ? 'Entregue' : 'Retirado';
    case 'cancelado':
      return 'Pedido cancelado';
  }
}

export const isFinalStatus = (status: OrderStatus) => status === 'concluido' || status === 'cancelado';

/** Próximo passo do fluxo de status (sem pular etapas). */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  novo: 'preparando',
  preparando: 'despachado',
  despachado: 'concluido',
};

export const ORDER_STATUSES: OrderStatus[] = ['novo', 'preparando', 'despachado', 'concluido', 'cancelado'];
