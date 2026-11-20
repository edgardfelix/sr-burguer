import type { Catalog, Category, Cents, DrinkChoiceMode, Product } from './types';

export const PROMO_CATEGORY_ID = 'promocoes';

export function isPromoActive(product: Product, now: number): boolean {
  const promo = product.promoPrice;
  if (promo === null || promo === undefined) return false;
  if (promo <= 0 || promo >= product.price) return false;
  if (product.promoEndsAt && product.promoEndsAt <= now) return false;
  return true;
}

export function effectivePrice(product: Product, now: number): Cents {
  return isPromoActive(product, now) ? (product.promoPrice as Cents) : product.price;
}

const byOrder = <T extends { order: number; name: string }>(a: T, b: T) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR');

export function sortedCategories(catalog: Catalog): Category[] {
  return Object.values(catalog.categories).sort(byOrder);
}

export function productsOf(catalog: Catalog, categoryId: string): Product[] {
  return Object.values(catalog.products)
    .filter((p) => p.categoryId === categoryId)
    .sort(byOrder);
}

export interface MenuSection {
  category: Category;
  products: Product[];
}

/**
 * Seções do cardápio público: categorias ativas com itens disponíveis.
 * "Promoções" reúne os itens da própria categoria e qualquer item com promoção ativa.
 */
export function buildMenuSections(catalog: Catalog, now: number): MenuSection[] {
  const sections: MenuSection[] = [];
  const available = Object.values(catalog.products).filter((p) => p.available);

  for (const category of sortedCategories(catalog)) {
    if (!category.active) continue;
    let items: Product[];
    if (category.id === PROMO_CATEGORY_ID) {
      const own = available.filter((p) => p.categoryId === PROMO_CATEGORY_ID).sort(byOrder);
      const promoted = available
        .filter((p) => p.categoryId !== PROMO_CATEGORY_ID && isPromoActive(p, now))
        .sort((a, b) => (a.promoEndsAt ?? Infinity) - (b.promoEndsAt ?? Infinity) || byOrder(a, b));
      items = [...own, ...promoted];
    } else {
      items = available.filter((p) => p.categoryId === category.id).sort(byOrder);
    }
    if (items.length > 0) sections.push({ category, products: items });
  }
  return sections;
}

// ------------------------------------------------------------------ bebida dos combos

/** Bebidas oferecidas nos combos: marcadas pela loja, disponíveis e com a categoria visível. */
export function comboDrinkOptions(catalog: Catalog): Product[] {
  const categoryOrder = (p: Product) => catalog.categories[p.categoryId]?.order ?? 0;
  return Object.values(catalog.products)
    .filter((p) => p.comboDrink && p.available && catalog.categories[p.categoryId]?.active !== false)
    .sort((a, b) => categoryOrder(a) - categoryOrder(b) || byOrder(a, b));
}

export interface DrinkChoice {
  mode: Exclude<DrinkChoiceMode, 'none'>;
  options: Product[];
}

/**
 * Escolha de bebida valendo agora para o item.
 * Se nenhuma bebida marcada estiver disponível, o item segue sem perguntar:
 * uma lata esgotada não impede a venda do combo.
 */
export function drinkChoiceFor(product: Product, catalog: Catalog): DrinkChoice | null {
  if (product.drinkChoice === 'none') return null;
  const options = comboDrinkOptions(catalog).filter((o) => o.id !== product.id);
  return options.length ? { mode: product.drinkChoice, options } : null;
}

/** Categoria de combos (id do cardápio inicial ou nome). Serve para sugerir a escolha de bebida no painel. */
export function isComboCategory(category: Pick<Category, 'id' | 'name'> | undefined): boolean {
  return Boolean(category && (category.id === 'combos' || /combo/i.test(category.name)));
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Menor e maior preço disponível (para dados estruturados). */
export function priceRange(catalog: Catalog, now: number): { min: Cents; max: Cents } | null {
  const prices = Object.values(catalog.products)
    .filter((p) => p.available)
    .map((p) => effectivePrice(p, now));
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
