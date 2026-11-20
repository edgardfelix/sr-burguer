import { buildMenuSections, effectivePrice, priceRange } from './catalog';
import { WEEK_ORDER } from './schedule';
import { absoluteUrl, formatAddressLine, getSiteUrl, hasStreetAddress, instagramUrl, SITE } from './site';
import type { Catalog, StoreSettings, Weekday } from './types';
import { toWhatsAppNumber } from './whatsapp';

const SCHEMA_DAYS: Record<Weekday, string> = {
  0: 'https://schema.org/Sunday',
  1: 'https://schema.org/Monday',
  2: 'https://schema.org/Tuesday',
  3: 'https://schema.org/Wednesday',
  4: 'https://schema.org/Thursday',
  5: 'https://schema.org/Friday',
  6: 'https://schema.org/Saturday',
};

export function openingHoursSpecification(hours: StoreSettings['hours']) {
  const groups = new Map<string, Weekday[]>();
  for (const day of WEEK_ORDER) {
    const h = hours[day];
    if (!h?.enabled) continue;
    const key = `${h.open}|${h.close}`;
    groups.set(key, [...(groups.get(key) ?? []), day]);
  }
  return [...groups.entries()].map(([key, days]) => {
    const [opens, closes] = key.split('|');
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: days.map((d) => SCHEMA_DAYS[d]), opens, closes };
  });
}

const reais = (cents: number) => (cents / 100).toFixed(2);

/** Dados estruturados Restaurant + Menu (schema.org), gerados do cardápio real. */
export function buildStructuredData(settings: StoreSettings, catalog: Catalog, now: number) {
  const siteUrl = getSiteUrl();
  const range = priceRange(catalog, now);
  const sameAs = [instagramUrl(settings.instagram), settings.ifoodUrl || null].filter(Boolean);
  const sections = buildMenuSections(catalog, now);

  const menu = {
    '@type': 'Menu',
    '@id': `${siteUrl}/#cardapio`,
    name: `Cardápio ${settings.name}`,
    inLanguage: SITE.language,
    hasMenuSection: sections.map((section) => ({
      '@type': 'MenuSection',
      name: section.category.name,
      ...(section.category.description ? { description: section.category.description } : {}),
      hasMenuItem: section.products.map((product) => ({
        '@type': 'MenuItem',
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
        ...(product.image?.startsWith('/images/') ? { image: absoluteUrl(product.image) } : {}),
        offers: { '@type': 'Offer', price: reais(effectivePrice(product, now)), priceCurrency: 'BRL' },
      })),
    })),
  };

  const restaurant = {
    '@type': 'Restaurant',
    '@id': `${siteUrl}/#restaurante`,
    name: settings.name,
    description: SITE.description,
    url: siteUrl,
    logo: absoluteUrl('/images/marca/logo-srburguer.png'),
    image: [absoluteUrl('/images/marca/burger-montado.jpg'), absoluteUrl('/images/marca/logo-srburguer.png')],
    servesCuisine: ['Hambúrguer', 'Lanches'],
    ...(range ? { priceRange: `R$ ${Math.floor(range.min / 100)} a R$ ${Math.ceil(range.max / 100)}` } : {}),
    currenciesAccepted: 'BRL',
    paymentAccepted: 'Pix, Cartão de crédito, Cartão de débito, Dinheiro',
    acceptsReservations: false,
    address: {
      '@type': 'PostalAddress',
      // Loja só de delivery: sem rua, o endereço fica só com cidade e estado.
      ...(hasStreetAddress(settings.address) ? { streetAddress: formatAddressLine(settings.address) } : {}),
      addressLocality: settings.address.city,
      addressRegion: settings.address.state,
      addressCountry: 'BR',
    },
    ...(settings.whatsapp ? { telephone: `+${toWhatsAppNumber(settings.whatsapp)}` } : {}),
    openingHoursSpecification: openingHoursSpecification(settings.hours),
    hasMenu: menu,
    ...(sameAs.length ? { sameAs } : {}),
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/#cardapio`,
        inLanguage: SITE.language,
        actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'],
      },
      deliveryMethod: [
        ...(settings.acceptsDelivery ? ['http://purl.org/goodrelations/v1#DeliveryModeOwnFleet'] : []),
        ...(settings.acceptsPickup ? ['http://purl.org/goodrelations/v1#DeliveryModePickUp'] : []),
      ],
    },
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#site`,
    url: siteUrl,
    name: settings.name,
    inLanguage: SITE.language,
    publisher: { '@id': `${siteUrl}/#restaurante` },
  };

  return { '@context': 'https://schema.org', '@graph': [restaurant, website] };
}
