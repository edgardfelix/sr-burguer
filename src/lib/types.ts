/**
 * Tipos de domínio compartilhados entre servidor e navegador.
 * Valores monetários são sempre inteiros em centavos.
 */

export type Cents = number;

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
  active: boolean;
}

/**
 * Escolha da bebida incluída no item (combos).
 * none = não pergunta; optional = pergunta, com "Sem preferência"; required = só adiciona depois de escolher.
 */
export type DrinkChoiceMode = 'none' | 'optional' | 'required';

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  /** Preço cheio, em centavos. */
  price: Cents;
  /** Preço promocional ativo (promoção relâmpago), em centavos. */
  promoPrice?: Cents | null;
  /** Fim da promoção (epoch ms). Sem valor: vale até ser desligada. */
  promoEndsAt?: number | null;
  /** Caminho em /public ou /api/media/:id. */
  image?: string | null;
  imageAlt?: string;
  /** Imagem com fundo transparente (ex.: latas): exibida contida, sem corte. */
  imageContain?: boolean;
  available: boolean;
  featured: boolean;
  order: number;
  /** Combos: pede ao cliente a bebida incluída, entre as bebidas marcadas com `comboDrink`. */
  drinkChoice: DrinkChoiceMode;
  /** Bebidas: entra como opção na escolha de bebida dos combos (some sozinha quando pausada). */
  comboDrink: boolean;
  updatedAt?: number;
}

export interface Catalog {
  categories: Record<string, Category>;
  products: Record<string, Product>;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayHours {
  enabled: boolean;
  /** "HH:MM" no fuso America/Sao_Paulo. */
  open: string;
  /** "HH:MM"; se menor que `open`, o expediente passa da meia-noite. */
  close: string;
}

export type WeekHours = Record<Weekday, DayHours>;

/** auto = segue o horário; open/closed = interruptor manual do painel. */
export type StoreMode = 'auto' | 'open' | 'closed';

export interface StoreSettings {
  name: string;
  tagline: string;
  /** Logo enviado pelo painel. Vazio = logo padrão da marca. */
  logo?: string | null;
  /** Somente dígitos com DDI, ex.: 5511999999999. Vazio = botão de WhatsApp oculto. */
  whatsapp: string;
  pixKey: string;
  instagram: string;
  ifoodUrl: string;
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
  };
  /** Taxa de entrega em centavos. null = combinada pelo WhatsApp. */
  deliveryFee: Cents | null;
  /** Pedido mínimo para entrega, em centavos (0 = sem mínimo). */
  minOrder: Cents;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  /** Texto livre de tempo estimado, ex.: "40 a 60 min". Vazio = não exibe. */
  etaText: string;
  hours: WeekHours;
  mode: StoreMode;
  announcement: { active: boolean; text: string };
  /** Repetir o alerta sonoro enquanto houver pedido novo sem aceite. */
  repeatAlert: boolean;
  updatedAt?: number;
}

export type FulfillmentType = 'delivery' | 'pickup';
export type PaymentMethod = 'pix' | 'card' | 'cash';
export type OrderStatus = 'novo' | 'preparando' | 'despachado' | 'concluido' | 'cancelado';

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: Cents;
  quantity: number;
  note?: string;
  /** Bebida escolhida para o combo, com o nome gravado no momento do pedido. */
  drink?: { id: string; name: string };
  total: Cents;
}

export interface DeliveryAddress {
  street: string;
  number: string;
  district: string;
  reference?: string;
}

export interface Order {
  id: string;
  /** Número sequencial do dia, exibido como #0001. */
  number: number;
  businessDate: string;
  createdAt: number;
  updatedAt: number;
  status: OrderStatus;
  customer: { name: string; phone: string };
  fulfillment: { type: FulfillmentType; address?: DeliveryAddress };
  payment: { method: PaymentMethod; changeFor?: Cents | null };
  items: OrderItem[];
  notes?: string;
  subtotal: Cents;
  /** null = taxa a combinar. */
  deliveryFee: Cents | null;
  total: Cents;
  statusHistory?: Partial<Record<OrderStatus, number>>;
  /** Código aleatório que só o aparelho de quem pediu recebe: libera o acompanhamento do status. */
  trackToken?: string;
}

/** O que o acompanhamento público devolve: só o andamento, sem dados pessoais. */
export interface OrderTracking {
  id: string;
  number: number;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  createdAt: number;
  updatedAt: number;
  statusHistory: Partial<Record<OrderStatus, number>>;
}

export interface DailyReport {
  businessDate: string;
  orders: number;
  cancelled: number;
  revenue: Cents;
  byPayment: Record<PaymentMethod, Cents>;
  byFulfillment: Record<FulfillmentType, number>;
  closedAt: number;
}

export interface StoreStatus {
  isOpen: boolean;
  source: 'schedule' | 'manual';
  /** Fechamento de hoje (epoch ms), quando aberto pelo horário. */
  closesAt: number | null;
  /** Próxima abertura (epoch ms), quando fechado. */
  nextOpenAt: number | null;
}

export interface PublicMenu {
  catalog: Catalog;
  settings: StoreSettings;
}
