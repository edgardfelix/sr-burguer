import { slugify } from '@/lib/catalog';
import type { ProductInput, SettingsInput } from '@/lib/schemas';
import { createDefaultSettings, createSeedCatalog } from '@/lib/seed';
import type { Catalog, Category, Product, StoreMode, StoreSettings } from '@/lib/types';
import type { Db } from '../data/db';
import { getDb, normalizeCatalog, normalizeSettings, PATHS } from '../data/repo';
import { HttpError, notConfigured } from '../http-error';
import { deleteMediaByUrl } from './media';

export interface MenuData {
  catalog: Catalog;
  settings: StoreSettings;
  source: 'db' | 'seed';
  /** Momento da leitura (epoch ms): base de horário para a renderização. */
  loadedAt: number;
}

let initialized = false;

/** Na primeira execução com banco vazio, grava o cardápio inicial e as configurações padrão. */
export async function ensureInitialized(db: Db): Promise<void> {
  if (initialized) return;
  const flag = await db.get<number>(`${PATHS.meta}/initializedAt`);
  if (!flag) {
    const [catalog, settings] = await Promise.all([db.get('catalog'), db.get(PATHS.settings)]);
    if (!normalizeCatalog(catalog)) await db.set('catalog', createSeedCatalog());
    if (!settings) await db.set(PATHS.settings, { ...createDefaultSettings(), updatedAt: Date.now() });
    await db.set(`${PATHS.meta}/initializedAt`, Date.now());
  }
  initialized = true;
}

export function resetInitializationCacheForTests(): void {
  initialized = false;
}

function seedMenu(): MenuData {
  return { catalog: createSeedCatalog(), settings: createDefaultSettings(), source: 'seed', loadedAt: Date.now() };
}

export async function loadMenu(): Promise<MenuData> {
  const db = getDb();
  if (!db) return seedMenu();
  try {
    await ensureInitialized(db);
    const [catalogRaw, settingsRaw] = await Promise.all([db.get('catalog'), db.get(PATHS.settings)]);
    return {
      catalog: normalizeCatalog(catalogRaw) ?? { categories: {}, products: {} },
      settings: normalizeSettings(settingsRaw),
      source: 'db',
      loadedAt: Date.now(),
    };
  } catch (error) {
    console.error('[srburguer] Falha ao ler o cardápio; usando dados iniciais.', error);
    return seedMenu();
  }
}

function requireDb(): Db {
  const db = getDb();
  if (!db) throw notConfigured();
  return db;
}

// ------------------------------------------------------------------ produtos

async function getProduct(db: Db, id: string): Promise<Product> {
  const catalog = normalizeCatalog({ products: { [id]: await db.get(`${PATHS.products}/${id}`) } });
  const product = catalog?.products[id];
  if (!product || !product.name) throw new HttpError(404, 'Item não encontrado.');
  return product;
}

async function assertCategory(db: Db, categoryId: string): Promise<void> {
  if (!(await db.get(`${PATHS.categories}/${categoryId}`))) {
    throw new HttpError(400, 'Categoria inexistente.', { categoryId: 'Escolha uma categoria válida' });
  }
}

export async function createProduct(input: ProductInput, now = Date.now()): Promise<Product> {
  const db = requireDb();
  await assertCategory(db, input.categoryId);
  const siblings = Object.values(normalizeCatalog({ products: (await db.get(PATHS.products)) ?? {} })?.products ?? {}).filter(
    (p) => p.categoryId === input.categoryId,
  );
  const id = db.newId();
  const product: Product = {
    id,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    price: input.price,
    promoPrice: input.promoPrice ?? null,
    promoEndsAt: input.promoPrice ? (input.promoEndsAt ?? null) : null,
    image: input.image ?? null,
    ...(input.imageAlt ? { imageAlt: input.imageAlt } : {}),
    imageContain: input.imageContain ?? false,
    available: input.available,
    featured: input.featured,
    order: input.order ?? siblings.reduce((max, p) => Math.max(max, p.order + 1), 0),
    drinkChoice: input.drinkChoice ?? 'none',
    comboDrink: input.comboDrink ?? false,
    updatedAt: now,
  };
  await db.set(`${PATHS.products}/${id}`, product);
  return product;
}

export async function updateProduct(id: string, input: ProductInput, now = Date.now()): Promise<Product> {
  const db = requireDb();
  const current = await getProduct(db, id);
  await assertCategory(db, input.categoryId);
  const next: Product = {
    ...current,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    price: input.price,
    promoPrice: input.promoPrice ?? null,
    promoEndsAt: input.promoPrice ? (input.promoEndsAt ?? null) : null,
    image: input.image ?? null,
    imageAlt: input.imageAlt ?? '',
    imageContain: input.imageContain ?? false,
    available: input.available,
    featured: input.featured,
    order: input.order ?? current.order,
    // Ausente (ex.: atalho de destaque na lista) = mantém o que já estava salvo.
    drinkChoice: input.drinkChoice ?? current.drinkChoice,
    comboDrink: input.comboDrink ?? current.comboDrink,
    updatedAt: now,
  };
  await db.set(`${PATHS.products}/${id}`, next);
  if (current.image && current.image !== next.image) await deleteMediaByUrl(current.image);
  return next;
}

export async function deleteProduct(id: string): Promise<void> {
  const db = requireDb();
  const current = await getProduct(db, id);
  await db.remove(`${PATHS.products}/${id}`);
  if (current.image) await deleteMediaByUrl(current.image);
}

export async function setProductAvailability(id: string, available: boolean, now = Date.now()): Promise<void> {
  const db = requireDb();
  await getProduct(db, id);
  await db.update(`${PATHS.products}/${id}`, { available, updatedAt: now });
}

export async function setProductPromo(
  id: string,
  promoPrice: number | null,
  durationMinutes: number | null,
  now = Date.now(),
): Promise<Product> {
  const db = requireDb();
  const product = await getProduct(db, id);
  if (promoPrice !== null && promoPrice >= product.price) {
    throw new HttpError(400, 'O preço promocional precisa ser menor que o preço cheio.', { promoPrice: 'Use um valor menor que o preço cheio' });
  }
  const promoEndsAt = promoPrice !== null && durationMinutes ? now + durationMinutes * 60_000 : null;
  await db.update(`${PATHS.products}/${id}`, { promoPrice, promoEndsAt, updatedAt: now });
  return { ...product, promoPrice, promoEndsAt };
}

export async function reorderProducts(ids: string[]): Promise<void> {
  const db = requireDb();
  const patch: Record<string, unknown> = {};
  ids.forEach((id, index) => {
    patch[`${id}/order`] = index;
  });
  await db.update(PATHS.products, patch);
}

// ------------------------------------------------------------------ categorias

export async function createCategory(input: { name: string; description?: string; active: boolean }): Promise<Category> {
  const db = requireDb();
  const existing = ((await db.get<Record<string, Category>>(PATHS.categories)) ?? {}) as Record<string, Category>;
  let id = slugify(input.name) || db.newId();
  if (existing[id]) id = `${id}-${db.newId().slice(-4).toLowerCase()}`;
  const category: Category = {
    id,
    slug: slugify(input.name) || id,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    active: input.active,
    order: Object.values(existing).reduce((max, c) => Math.max(max, Number(c.order ?? 0) + 1), 0),
  };
  await db.set(`${PATHS.categories}/${id}`, category);
  return category;
}

export async function updateCategory(id: string, input: { name: string; description?: string; active: boolean }): Promise<void> {
  const db = requireDb();
  if (!(await db.get(`${PATHS.categories}/${id}`))) throw new HttpError(404, 'Categoria não encontrada.');
  await db.update(`${PATHS.categories}/${id}`, {
    name: input.name,
    slug: slugify(input.name) || id,
    description: input.description || null,
    active: input.active,
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const db = requireDb();
  const products = normalizeCatalog({ products: (await db.get(PATHS.products)) ?? {} })?.products ?? {};
  if (Object.values(products).some((p) => p.categoryId === id)) {
    throw new HttpError(409, 'Mova ou exclua os itens desta categoria antes de removê-la.');
  }
  await db.remove(`${PATHS.categories}/${id}`);
}

export async function reorderCategories(ids: string[]): Promise<void> {
  const db = requireDb();
  const patch: Record<string, unknown> = {};
  ids.forEach((id, index) => {
    patch[`${id}/order`] = index;
  });
  await db.update(PATHS.categories, patch);
}

/** Restaura o cardápio inicial (substitui categorias e itens). */
export async function restoreSeedCatalog(): Promise<void> {
  const db = requireDb();
  await db.set('catalog', createSeedCatalog());
}

// ------------------------------------------------------------------ loja

export async function updateSettings(input: SettingsInput, now = Date.now()): Promise<StoreSettings> {
  const db = requireDb();
  const current = normalizeSettings(await db.get(PATHS.settings));
  if (current.logo && current.logo !== (input.logo ?? null)) await deleteMediaByUrl(current.logo);
  const next: StoreSettings = { ...current, ...input, logo: input.logo ?? null, updatedAt: now };
  await db.set(PATHS.settings, next);
  return next;
}

export async function setStoreMode(mode: StoreMode, now = Date.now()): Promise<void> {
  const db = requireDb();
  await db.update(PATHS.settings, { mode, updatedAt: now });
}
