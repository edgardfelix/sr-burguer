import { describe, expect, it } from 'vitest';
import { buildMenuSections, comboDrinkOptions, drinkChoiceFor, effectivePrice, isPromoActive, slugify } from './catalog';
import { formatBRL, parseBRL } from './money';
import { normalizeCatalog } from './normalize';
import { formatOrderNumber, OrderPricingError, priceOrder, statusLabel, trackingLabel } from './order';
import { createDefaultSettings, createSeedCatalog } from './seed';
import type { Product } from './types';

const NOW = Date.UTC(2026, 10, 15, 23, 0);

describe('dinheiro', () => {
  it('formata em reais', () => {
    expect(formatBRL(4290)).toBe('R$ 42,90');
    expect(formatBRL(16990)).toBe('R$ 169,90');
  });

  it('interpreta valores digitados', () => {
    expect(parseBRL('42,90')).toBe(4290);
    expect(parseBRL('R$ 1.234,50')).toBe(123450);
    expect(parseBRL('8')).toBe(800);
    expect(parseBRL('abc')).toBeNull();
  });
});

describe('promoções', () => {
  it('ativa promoção válida e ignora promoção vencida ou maior que o preço', () => {
    const base = createSeedCatalog().products['sr-salad-bacon']!;
    expect(isPromoActive({ ...base, promoPrice: 2490 }, NOW)).toBe(true);
    expect(effectivePrice({ ...base, promoPrice: 2490 }, NOW)).toBe(2490);
    expect(isPromoActive({ ...base, promoPrice: 2490, promoEndsAt: NOW - 1 }, NOW)).toBe(false);
    expect(isPromoActive({ ...base, promoPrice: 9990 }, NOW)).toBe(false);
  });

  it('seção de promoções reúne a categoria e itens com promoção ativa', () => {
    const catalog = createSeedCatalog();
    catalog.products['sr-salad-bacon']!.promoPrice = 2490;
    const promo = buildMenuSections(catalog, NOW).find((s) => s.category.id === 'promocoes');
    expect(promo?.products.map((p) => p.id)).toEqual(['promocao-2-lanches', 'sr-salad-bacon']);
  });

  it('esconde categorias vazias e itens pausados', () => {
    const catalog = createSeedCatalog();
    expect(buildMenuSections(catalog, NOW)[0]?.category.id).toBe('promocoes');
    catalog.products['promocao-2-lanches']!.available = false;
    const sections = buildMenuSections(catalog, NOW);
    expect(sections.some((s) => s.category.id === 'promocoes')).toBe(false);
    expect(sections[0]?.category.id).toBe('lanches');
  });
});

describe('priceOrder', () => {
  const catalog = createSeedCatalog();
  const settings = { ...createDefaultSettings(), deliveryFee: 500 };

  it('soma linhas iguais e calcula entrega', () => {
    const priced = priceOrder(
      [
        { productId: 'sr-salad-bacon', quantity: 1 },
        { productId: 'sr-salad-bacon', quantity: 1, note: ' ' },
        { productId: 'pepsi-200ml', quantity: 2 },
      ],
      catalog,
      settings,
      'delivery',
      NOW,
    );
    expect(priced.items).toHaveLength(2);
    expect(priced.items[0]).toMatchObject({ productId: 'sr-salad-bacon', quantity: 2, total: 5998 });
    expect(priced.subtotal).toBe(5998 + 1200);
    expect(priced.total).toBe(5998 + 1200 + 500);
  });

  it('mantém observações diferentes como linhas separadas', () => {
    const priced = priceOrder(
      [
        { productId: 'sr-salad-bacon', quantity: 1, note: 'sem tomate' },
        { productId: 'sr-salad-bacon', quantity: 1 },
      ],
      catalog,
      settings,
      'pickup',
      NOW,
    );
    expect(priced.items).toHaveLength(2);
    expect(priced.deliveryFee).toBe(0);
  });

  it('taxa a combinar não entra no total', () => {
    const priced = priceOrder([{ productId: 'sr-burguer', quantity: 1 }], catalog, { deliveryFee: null }, 'delivery', NOW);
    expect(priced.deliveryFee).toBeNull();
    expect(priced.total).toBe(2499);
  });

  it('usa o preço do servidor, nunca o do navegador', () => {
    const promo = createSeedCatalog();
    promo.products['sr-salad-bacon']!.promoPrice = 2500;
    expect(priceOrder([{ productId: 'sr-salad-bacon', quantity: 1 }], promo, settings, 'pickup', NOW).total).toBe(2500);
  });

  it('recusa itens pausados, inexistentes ou com quantidade inválida', () => {
    const paused = createSeedCatalog();
    paused.products['sr-burguer']!.available = false;
    expect(() => priceOrder([{ productId: 'sr-burguer', quantity: 1 }], paused, settings, 'pickup', NOW)).toThrow(OrderPricingError);
    expect(() => priceOrder([{ productId: 'nao-existe', quantity: 1 }], catalog, settings, 'pickup', NOW)).toThrow(OrderPricingError);
    expect(() => priceOrder([{ productId: 'sr-salad-bacon', quantity: 0 }], catalog, settings, 'pickup', NOW)).toThrow(OrderPricingError);
    expect(() => priceOrder([], catalog, settings, 'pickup', NOW)).toThrow(OrderPricingError);
  });
});

describe('rótulos', () => {
  it('numera pedidos com quatro dígitos', () => {
    expect(formatOrderNumber(7)).toBe('#0007');
  });

  it('adapta o status despachado ao tipo de pedido', () => {
    expect(statusLabel('despachado', 'delivery')).toBe('Saiu para entrega');
    expect(statusLabel('despachado', 'pickup')).toBe('Pronto para retirada');
  });

  it('gera slugs sem acento', () => {
    expect(slugify('Porções & Bebidas')).toBe('porcoes-bebidas');
  });
});

describe('seed', () => {
  it('todo produto aponta para uma categoria existente e tem preço positivo', () => {
    const catalog = createSeedCatalog();
    for (const product of Object.values(catalog.products)) {
      expect(catalog.categories[product.categoryId], product.id).toBeDefined();
      expect(product.price).toBeGreaterThan(0);
    }
    expect(Object.keys(catalog.products)).toHaveLength(11);
  });
});

describe('bebida dos combos', () => {
  const settings = { ...createDefaultSettings(), deliveryFee: 500 };
  const combo = (drinkId?: string, quantity = 1) => ({ productId: 'combo-sr-salad', quantity, ...(drinkId ? { drinkId } : {}) });

  it('oferece os refris marcados e disponíveis, só nos combos e na promoção', () => {
    const catalog = createSeedCatalog();
    expect(comboDrinkOptions(catalog).map((p) => p.id)).toEqual(['pepsi-200ml', 'guarana-antarctica-200ml']);
    expect(drinkChoiceFor(catalog.products['combo-sr-salad']!, catalog)?.mode).toBe('required');
    expect(drinkChoiceFor(catalog.products['promocao-2-lanches']!, catalog)?.mode).toBe('optional');
    expect(drinkChoiceFor(catalog.products['sr-burguer']!, catalog)).toBeNull();
  });

  it('exige a bebida obrigatória e grava o nome no item, sem mudar o preço', () => {
    const catalog = createSeedCatalog();
    expect(() => priceOrder([combo()], catalog, settings, 'pickup', NOW)).toThrow('Escolha a bebida do Combo SR Salad.');
    const priced = priceOrder([combo('guarana-antarctica-200ml')], catalog, settings, 'pickup', NOW);
    expect(priced.items[0]?.drink).toEqual({ id: 'guarana-antarctica-200ml', name: 'Guaraná Antarctica 200 ml' });
    expect(priced.subtotal).toBe(3499);
  });

  it('recusa bebida pausada ou que não é opção de combo', () => {
    const catalog = createSeedCatalog();
    catalog.products['guarana-antarctica-200ml']!.available = false;
    expect(() => priceOrder([combo('guarana-antarctica-200ml')], catalog, settings, 'pickup', NOW)).toThrow(/acabou/);
    expect(() => priceOrder([combo('sr-burguer')], catalog, settings, 'pickup', NOW)).toThrow(/acabou/);
  });

  it('junta o mesmo combo com a mesma bebida e separa bebidas diferentes', () => {
    const priced = priceOrder([combo('pepsi-200ml'), combo('pepsi-200ml', 2), combo('guarana-antarctica-200ml')], createSeedCatalog(), settings, 'pickup', NOW);
    expect(priced.items.map((i) => [i.drink?.id, i.quantity])).toEqual([
      ['pepsi-200ml', 3],
      ['guarana-antarctica-200ml', 1],
    ]);
  });

  it('escolha opcional aceita pedido sem bebida; item sem escolha ignora bebida enviada', () => {
    const catalog = createSeedCatalog();
    catalog.products['combo-sr-salad']!.drinkChoice = 'optional';
    expect(priceOrder([combo()], catalog, settings, 'pickup', NOW).items[0]?.drink).toBeUndefined();
    const plain = priceOrder([{ productId: 'sr-burguer', quantity: 1, drinkId: 'pepsi-200ml' }], catalog, settings, 'pickup', NOW);
    expect(plain.items[0]?.drink).toBeUndefined();
  });

  it('sem nenhuma bebida disponível, o combo continua à venda sem a pergunta', () => {
    const catalog = createSeedCatalog();
    for (const product of Object.values(catalog.products)) if (product.comboDrink) product.available = false;
    expect(drinkChoiceFor(catalog.products['combo-sr-salad']!, catalog)).toBeNull();
    expect(priceOrder([combo()], catalog, settings, 'pickup', NOW).items).toHaveLength(1);
  });
});

describe('cardápio gravado antes da escolha de bebida', () => {
  const legacy = () => {
    const catalog = createSeedCatalog();
    // Lata no padrão antigo, para cobrir a regra que transforma latas em opção de combo.
    catalog.products['coca-cola-lata'] = { ...catalog.products['pepsi-200ml']!, id: 'coca-cola-lata', name: 'Coca-Cola lata 350 ml' };
    for (const product of Object.values(catalog.products) as Partial<Product>[]) {
      delete product.drinkChoice;
      delete product.comboDrink;
    }
    return JSON.parse(JSON.stringify(catalog)) as unknown;
  };

  it('combos com refrigerante passam a pedir a bebida e as latas viram opção', () => {
    const catalog = normalizeCatalog(legacy())!;
    expect(catalog.products['combo-sr-burguer']?.drinkChoice).toBe('required');
    expect(catalog.products['promocao-2-lanches']?.drinkChoice).toBe('none');
    expect(catalog.products['coca-cola-lata']?.comboDrink).toBe(true);
    expect(catalog.products['sr-burguer']?.comboDrink).toBe(false);
  });

  it('o que a loja salvou no painel prevalece sobre o padrão', () => {
    const raw = legacy() as { products: Record<string, Record<string, unknown>> };
    raw.products['combo-sr-burguer']!.drinkChoice = 'none';
    raw.products['coca-cola-lata']!.comboDrink = false;
    const catalog = normalizeCatalog(raw)!;
    expect(catalog.products['combo-sr-burguer']?.drinkChoice).toBe('none');
    expect(catalog.products['coca-cola-lata']?.comboDrink).toBe(false);
  });
});

describe('acompanhamento do pedido', () => {
  it('fala com o cliente conforme a etapa e o tipo de pedido', () => {
    expect(trackingLabel('novo', 'delivery')).toBe('Pedido recebido');
    expect(trackingLabel('despachado', 'delivery')).toBe('Saiu para entrega');
    expect(trackingLabel('despachado', 'pickup')).toBe('Pronto para retirada');
    expect(trackingLabel('concluido', 'pickup')).toBe('Retirado');
    expect(trackingLabel('cancelado', 'pickup')).toBe('Pedido cancelado');
  });
});
