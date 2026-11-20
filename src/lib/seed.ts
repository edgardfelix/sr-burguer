import type { Catalog, Category, Product, StoreSettings } from './types';

/**
 * Cardápio inicial, transcrito dos posts do Instagram da SR Burguer (@sr_burguer_01): cardápio de lanches
 * artesanais com preço avulso e no combo (lanche + batata + refri 200 ml) e a promoção de 2 lanches.
 * Tudo é editável no painel. Os refris de 200 ml são as opções de bebida dos combos.
 */

const categories: Category[] = [
  { id: 'promocoes', slug: 'promocoes', name: 'Promoções', order: 0, active: true, description: 'Ofertas da casa, por tempo limitado.' },
  { id: 'lanches', slug: 'lanches-artesanais', name: 'Lanches artesanais', order: 1, active: true, description: 'Carne artesanal de 120 g em todos os lanches.' },
  { id: 'combos', slug: 'combos', name: 'Combos', order: 2, active: true, description: 'Lanche com batata e refrigerante de 200 ml.' },
  { id: 'bebidas', slug: 'bebidas', name: 'Bebidas', order: 3, active: true },
];

type SeedProduct = Omit<Product, 'order' | 'available' | 'featured' | 'drinkChoice' | 'comboDrink'> &
  Partial<Pick<Product, 'available' | 'featured' | 'drinkChoice' | 'comboDrink'>>;

const img = (slug: string) => `/images/produtos/${slug}.webp`;

const products: SeedProduct[] = [
  // Promoções
  {
    id: 'promocao-2-lanches',
    categoryId: 'promocoes',
    drinkChoice: 'optional',
    name: 'Promoção 2 lanches',
    description: '2 lanches, 2 batatas e 2 refrigerantes de 200 ml.',
    price: 5999,
    image: img('promocao-2-lanches'),
    imageAlt: 'Dois lanches artesanais com queijo, alface, tomate e cebola roxa',
    featured: true,
  },

  // Lanches artesanais
  {
    id: 'sr-burguer',
    categoryId: 'lanches',
    name: 'SR Burguer',
    description: 'Pão, carne artesanal de 120 g, queijo cheddar e molho especial.',
    price: 2499,
    image: img('sr-burguer'),
    imageAlt: 'SR Burguer com carne artesanal, cheddar derretido e molho especial no pão',
    featured: true,
  },
  {
    id: 'sr-salad',
    categoryId: 'lanches',
    name: 'SR Salad',
    description: 'Pão, carne artesanal de 120 g, queijo cheddar, molho especial, alface e tomate.',
    price: 2499,
    image: img('sr-salad'),
    imageAlt: 'SR Salad com carne artesanal, cheddar, alface e tomate no pão',
  },
  {
    id: 'sr-salad-bacon',
    categoryId: 'lanches',
    name: 'SR Salad Bacon',
    description: 'Pão, carne artesanal de 120 g, queijo cheddar, bacon, molho especial, alface e tomate.',
    price: 2999,
    image: img('sr-salad-bacon'),
    imageAlt: 'SR Salad Bacon com carne artesanal, bacon, cheddar, alface e tomate',
  },
  {
    id: 'sr-cheddar-melt',
    categoryId: 'lanches',
    name: 'SR Cheddar Melt',
    description: 'Pão, carne artesanal de 120 g, molho cheddar artesanal e bacon.',
    price: 2999,
    image: img('sr-cheddar-melt'),
    imageAlt: 'SR Cheddar Melt com molho cheddar escorrendo sobre a carne e bacon',
  },

  // Combos
  {
    id: 'combo-sr-burguer',
    categoryId: 'combos',
    drinkChoice: 'required',
    name: 'Combo SR Burguer',
    description: 'SR Burguer com batata e refrigerante de 200 ml.',
    price: 3499,
    image: img('sr-burguer'),
    imageAlt: 'SR Burguer, lanche do combo com batata e refrigerante',
  },
  {
    id: 'combo-sr-salad',
    categoryId: 'combos',
    drinkChoice: 'required',
    name: 'Combo SR Salad',
    description: 'SR Salad com batata e refrigerante de 200 ml.',
    price: 3499,
    image: img('sr-salad'),
    imageAlt: 'SR Salad, lanche do combo com batata e refrigerante',
  },
  {
    id: 'combo-sr-salad-bacon',
    categoryId: 'combos',
    drinkChoice: 'required',
    name: 'Combo SR Salad Bacon',
    description: 'SR Salad Bacon com batata e refrigerante de 200 ml.',
    price: 3999,
    image: img('sr-salad-bacon'),
    imageAlt: 'SR Salad Bacon, lanche do combo com batata e refrigerante',
  },
  {
    id: 'combo-sr-cheddar-melt',
    categoryId: 'combos',
    drinkChoice: 'required',
    name: 'Combo SR Cheddar Melt',
    description: 'SR Cheddar Melt com batata e refrigerante de 200 ml.',
    price: 3999,
    image: img('sr-cheddar-melt'),
    imageAlt: 'SR Cheddar Melt, lanche do combo com batata e refrigerante',
  },

  // Bebidas
  { id: 'pepsi-200ml', categoryId: 'bebidas', name: 'Pepsi 200 ml', description: 'Garrafa de 200 ml.', price: 600, comboDrink: true },
  { id: 'guarana-antarctica-200ml', categoryId: 'bebidas', name: 'Guaraná Antarctica 200 ml', description: 'Garrafa de 200 ml.', price: 600, comboDrink: true },
];

export function createSeedCatalog(): Catalog {
  const perCategory = new Map<string, number>();
  const catalog: Catalog = { categories: {}, products: {} };
  for (const category of categories) catalog.categories[category.id] = { ...category };
  for (const item of products) {
    const order = perCategory.get(item.categoryId) ?? 0;
    perCategory.set(item.categoryId, order + 1);
    catalog.products[item.id] = {
      promoPrice: null,
      promoEndsAt: null,
      image: null,
      imageContain: false,
      ...item,
      available: item.available ?? true,
      featured: item.featured ?? false,
      drinkChoice: item.drinkChoice ?? 'none',
      comboDrink: item.comboDrink ?? false,
      order,
    };
  }
  return catalog;
}

export function createDefaultSettings(): StoreSettings {
  const day = (enabled: boolean) => ({ enabled, open: '18:00', close: '23:30' });
  return {
    name: 'SR Burguer',
    tagline: 'Lanche artesanal',
    logo: null,
    whatsapp: '5511917812791',
    pixKey: '',
    instagram: 'sr_burguer_01',
    ifoodUrl: '',
    // Só delivery, sem balcão: rua, número e bairro vazios fazem o site mostrar "Delivery em Itapevi/SP".
    address: { street: '', number: '', district: '', city: 'Itapevi', state: 'SP' },
    deliveryFee: null,
    minOrder: 0,
    acceptsDelivery: true,
    acceptsPickup: false,
    etaText: '',
    hours: { 0: day(true), 1: day(false), 2: day(true), 3: day(true), 4: day(true), 5: day(true), 6: day(true) },
    mode: 'auto',
    announcement: { active: false, text: '' },
    repeatAlert: true,
  };
}
