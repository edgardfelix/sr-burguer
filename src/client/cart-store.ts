'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { cartLineKey, isFinalStatus, MAX_QUANTITY_PER_ITEM } from '@/lib/order';
import { businessDateOf } from '@/lib/schedule';
import type { FulfillmentType, Order, OrderTracking, PaymentMethod } from '@/lib/types';
import { persistStorage, STORAGE_KEYS } from './storage';

export interface CartLine {
  key: string;
  productId: string;
  quantity: number;
  note?: string;
  /** Bebida escolhida para o combo. */
  drinkId?: string;
}

export interface CartLineDraft {
  productId: string;
  quantity: number;
  note?: string;
  drinkId?: string;
}

function toLine({ productId, quantity, note, drinkId }: CartLineDraft): CartLine {
  const cleanNote = note?.trim() || undefined;
  const cleanDrink = drinkId || undefined;
  return {
    key: cartLineKey(productId, cleanNote, cleanDrink),
    productId,
    quantity: Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, quantity)),
    ...(cleanNote ? { note: cleanNote } : {}),
    ...(cleanDrink ? { drinkId: cleanDrink } : {}),
  };
}

/** Soma a linha nova a uma igual (mesmo item, bebida e observação) ou acrescenta no fim. */
function mergeLine(lines: CartLine[], draft: CartLineDraft, at = lines.length): CartLine[] {
  const line = toLine(draft);
  const existing = lines.find((l) => l.key === line.key);
  if (existing) {
    return lines.map((l) => (l.key === line.key ? { ...l, quantity: Math.min(MAX_QUANTITY_PER_ITEM, l.quantity + line.quantity) } : l));
  }
  return [...lines.slice(0, at), line, ...lines.slice(at)];
}

interface CartState {
  lines: CartLine[];
  add: (draft: CartLineDraft) => void;
  /** Troca uma linha pela versão editada (ex.: outra bebida), na mesma posição. */
  replace: (key: string, draft: CartLineDraft) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

/** Carrinho salvo neste aparelho. skipHydration evita divergência com o HTML do servidor. */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (draft) => set((state) => ({ lines: mergeLine(state.lines, draft) })),
      replace: (key, draft) =>
        set((state) => {
          const index = state.lines.findIndex((l) => l.key === key);
          if (index < 0) return { lines: mergeLine(state.lines, draft) };
          return { lines: mergeLine(state.lines.filter((l) => l.key !== key), draft, index) };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY_PER_ITEM, quantity) } : l)),
        })),
      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: STORAGE_KEYS.cart,
      version: 2,
      storage: createJSONStorage(persistStorage),
      skipHydration: true,
      partialize: (state) => ({ lines: state.lines }),
      // v1 não tinha bebida na chave da linha: recalcula as chaves no formato novo.
      migrate: (persisted) => {
        const lines = ((persisted as { lines?: CartLine[] } | null)?.lines ?? []).filter((l) => l && typeof l.productId === 'string');
        return { lines: lines.reduce<CartLine[]>((acc, l) => mergeLine(acc, l), []) };
      },
    },
  ),
);

export interface CustomerProfile {
  name: string;
  phone: string;
  fulfillment: FulfillmentType;
  street: string;
  number: string;
  district: string;
  reference: string;
  payment: PaymentMethod;
}

const emptyCustomer: CustomerProfile = {
  name: '',
  phone: '',
  fulfillment: 'delivery',
  street: '',
  number: '',
  district: '',
  reference: '',
  payment: 'pix',
};

interface CustomerState {
  profile: CustomerProfile;
  save: (profile: Partial<CustomerProfile>) => void;
  forget: () => void;
}

/** Dados de entrega lembrados para o próximo pedido (só neste aparelho). */
export const useCustomer = create<CustomerState>()(
  persist(
    (set) => ({
      profile: emptyCustomer,
      save: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
      forget: () => set({ profile: emptyCustomer }),
    }),
    {
      name: STORAGE_KEYS.customer,
      version: 1,
      storage: createJSONStorage(persistStorage),
      skipHydration: true,
    },
  ),
);

type Panel = 'cart' | 'checkout' | 'success' | null;

/** Linha do carrinho aberta para edição no painel do item (ex.: trocar a bebida do combo). */
export type EditingLine = CartLine;

interface UiState {
  productId: string | null;
  editing: EditingLine | null;
  panel: Panel;
  openProduct: (id: string | null, editing?: EditingLine) => void;
  openPanel: (panel: Panel) => void;
}

export const useMenuUi = create<UiState>()((set) => ({
  productId: null,
  editing: null,
  panel: null,
  openProduct: (productId, editing) => set({ productId, editing: productId ? (editing ?? null) : null }),
  openPanel: (panel) => set({ panel }),
}));

// ------------------------------------------------------------------ pedido acompanhado

/** Depois de concluído ou cancelado, o pedido ainda aparece por este tempo. */
const FINISHED_VISIBLE_MS = 30 * 60_000;

interface TrackingState {
  order: Order | null;
  /** A consulta respondeu "não encontrado": pedido encerrado no fechamento do dia. */
  lost: boolean;
  track: (order: Order) => void;
  applyTracking: (tracking: OrderTracking) => void;
  markLost: () => void;
  clear: () => void;
}

/**
 * Último pedido feito neste aparelho, para acompanhar o andamento mesmo depois de recarregar a página.
 * Fica salvo só aqui e sai sozinho na virada do dia de funcionamento.
 */
export const useTrackedOrder = create<TrackingState>()(
  persist(
    (set) => ({
      order: null,
      lost: false,
      track: (order) => set({ order, lost: false }),
      applyTracking: (tracking) =>
        set((state) =>
          state.order && state.order.id === tracking.id
            ? { order: { ...state.order, status: tracking.status, updatedAt: tracking.updatedAt, statusHistory: tracking.statusHistory }, lost: false }
            : state,
        ),
      markLost: () => set({ lost: true }),
      clear: () => set({ order: null, lost: false }),
    }),
    {
      name: STORAGE_KEYS.lastOrder,
      version: 1,
      storage: createJSONStorage(persistStorage),
      skipHydration: true,
    },
  ),
);

/** O pedido ainda merece aparecer? (mesmo dia de funcionamento, não encerrado, finalizado há pouco tempo). */
export function isTrackingRelevant(order: Order | null, now: number, lost = false): order is Order {
  if (!order?.trackToken || lost) return false;
  if (order.businessDate !== businessDateOf(now)) return false;
  if (isFinalStatus(order.status) && now - order.updatedAt > FINISHED_VISIBLE_MS) return false;
  return true;
}
