'use client';

import { useMemo } from 'react';
import { useCart, type CartLine } from '@/client/cart-store';
import { useHydrated } from '@/client/hooks';
import { drinkChoiceFor, effectivePrice, type DrinkChoice } from '@/lib/catalog';
import type { Product } from '@/lib/types';
import { useStore } from './StoreProvider';

/** O que impede a linha de seguir para o pedido. */
export type LineIssue = 'unavailable' | 'drink-missing' | 'drink-unavailable';

export interface CartItemView {
  line: CartLine;
  product: Product | null;
  /** Escolha de bebida valendo agora para o item (null = item sem escolha). */
  choice: DrinkChoice | null;
  /** Bebida escolhida, se ainda estiver entre as opções. */
  drink: Product | null;
  unitPrice: number;
  total: number;
  available: boolean;
  issue: LineIssue | null;
}

/** Junta as linhas do carrinho com o cardápio atual (preço, disponibilidade e bebida de agora). */
export function useCartSummary() {
  const { catalog, now } = useStore();
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();

  return useMemo(() => {
    const source = hydrated ? lines : [];
    const items: CartItemView[] = source.map((line) => {
      const product = catalog.products[line.productId] ?? null;
      const category = product ? catalog.categories[product.categoryId] : undefined;
      const available = Boolean(product?.available && category?.active !== false);
      const unitPrice = product ? effectivePrice(product, now) : 0;
      const choice = product ? drinkChoiceFor(product, catalog) : null;
      const drink = choice && line.drinkId ? (choice.options.find((o) => o.id === line.drinkId) ?? null) : null;

      let issue: LineIssue | null = null;
      if (!available) issue = 'unavailable';
      else if (choice && line.drinkId && !drink) issue = 'drink-unavailable';
      else if (choice?.mode === 'required' && !line.drinkId) issue = 'drink-missing';

      return { line, product, choice, drink, unitPrice, total: available ? unitPrice * line.quantity : 0, available, issue };
    });
    const count = items.reduce((n, i) => n + i.line.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const blocked = items.filter((i) => i.issue !== null);
    return { items, count, subtotal, blocked, hydrated };
  }, [catalog, lines, now, hydrated]);
}
