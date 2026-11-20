import { createDefaultSettings } from './seed';
import type { Catalog, Category, DailyReport, DrinkChoiceMode, Order, Product, StoreSettings, WeekHours } from './types';

/**
 * Normalizadores do que vem do Realtime Database (servidor e painel no navegador):
 * o RTDB devolve arrays para chaves numéricas sequenciais e omite valores null.
 */

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Converte arrays que o RTDB devolve para chaves numéricas (ex.: horários 0 a 6) em objetos. */
export function asRecord(v: unknown): Record<string, unknown> {
  if (Array.isArray(v)) return Object.fromEntries(v.map((item, i) => [String(i), item]).filter(([, item]) => item != null));
  return isObject(v) ? v : {};
}

export function normalizeSettings(raw: unknown): StoreSettings {
  const defaults = createDefaultSettings();
  if (!isObject(raw)) return defaults;
  const hoursRaw = asRecord(raw.hours);
  const hours = { ...defaults.hours } as WeekHours;
  for (const key of [0, 1, 2, 3, 4, 5, 6] as const) {
    const day = hoursRaw[String(key)];
    if (isObject(day)) hours[key] = { ...defaults.hours[key], ...(day as object) } as WeekHours[typeof key];
  }
  return {
    ...defaults,
    ...(raw as Partial<StoreSettings>),
    address: { ...defaults.address, ...(isObject(raw.address) ? (raw.address as object) : {}) },
    announcement: { ...defaults.announcement, ...(isObject(raw.announcement) ? (raw.announcement as object) : {}) },
    deliveryFee: typeof raw.deliveryFee === 'number' ? raw.deliveryFee : null,
    logo: typeof raw.logo === 'string' ? raw.logo : null,
    hours,
  };
}

const DRINK_MODES: readonly DrinkChoiceMode[] = ['none', 'optional', 'required'];

/**
 * Itens gravados antes da escolha de bebida não têm os campos. O padrão repete o cardápio inicial:
 * combos que incluem refrigerante pedem a bebida, e as latas são as opções.
 * Ao salvar o item no painel, o valor passa a ser gravado e este padrão deixa de valer para ele.
 */
function legacyDrinkChoice(categoryId: string, description: string): DrinkChoiceMode {
  return categoryId === 'combos' && /refrigerante|\brefri\b|bebida/i.test(description) ? 'required' : 'none';
}

function legacyComboDrink(categoryId: string, name: string): boolean {
  return categoryId === 'bebidas' && /\blata\b/i.test(name);
}

export function normalizeCatalog(raw: unknown): Catalog | null {
  if (!isObject(raw)) return null;
  const categories: Record<string, Category> = {};
  for (const [id, value] of Object.entries(asRecord(raw.categories))) {
    if (!isObject(value)) continue;
    categories[id] = {
      id,
      name: String(value.name ?? 'Categoria'),
      slug: String(value.slug ?? id),
      order: Number(value.order ?? 0),
      active: value.active !== false,
      ...(value.description ? { description: String(value.description) } : {}),
    };
  }
  const products: Record<string, Product> = {};
  for (const [id, value] of Object.entries(asRecord(raw.products))) {
    if (!isObject(value)) continue;
    const categoryId = String(value.categoryId ?? '');
    const name = String(value.name ?? '');
    const description = String(value.description ?? '');
    products[id] = {
      id,
      categoryId,
      name,
      description,
      price: Number(value.price ?? 0),
      promoPrice: typeof value.promoPrice === 'number' ? value.promoPrice : null,
      promoEndsAt: typeof value.promoEndsAt === 'number' ? value.promoEndsAt : null,
      image: typeof value.image === 'string' ? value.image : null,
      ...(value.imageAlt ? { imageAlt: String(value.imageAlt) } : {}),
      imageContain: value.imageContain === true,
      available: value.available !== false,
      featured: value.featured === true,
      order: Number(value.order ?? 0),
      drinkChoice: DRINK_MODES.includes(value.drinkChoice as DrinkChoiceMode)
        ? (value.drinkChoice as DrinkChoiceMode)
        : legacyDrinkChoice(categoryId, description),
      comboDrink: typeof value.comboDrink === 'boolean' ? value.comboDrink : legacyComboDrink(categoryId, name),
      ...(typeof value.updatedAt === 'number' ? { updatedAt: value.updatedAt } : {}),
    };
  }
  if (Object.keys(categories).length === 0 && Object.keys(products).length === 0) return null;
  return { categories, products };
}

export function normalizeOrder(id: string, raw: unknown): Order | null {
  if (!isObject(raw)) return null;
  const items = Array.isArray(raw.items) ? raw.items : Object.values(asRecord(raw.items));
  // O RTDB não guarda null: taxa "a combinar" volta como ausente.
  const deliveryFee = typeof raw.deliveryFee === 'number' ? raw.deliveryFee : null;
  return { ...(raw as unknown as Order), id, items: items as Order['items'], deliveryFee };
}

export function normalizeOrders(raw: unknown): Order[] {
  return Object.entries(asRecord(raw))
    .map(([id, value]) => normalizeOrder(id, value))
    .filter((o): o is Order => o !== null)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function normalizeReports(raw: unknown): DailyReport[] {
  return Object.values(asRecord(raw))
    .filter(isObject)
    .map((r) => r as unknown as DailyReport)
    .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
}
