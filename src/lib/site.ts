import type { StoreSettings } from './types';

export const SITE = {
  name: 'SR Burguer',
  locale: 'pt_BR',
  language: 'pt-BR',
  title: 'SR Burguer | Hambúrguer artesanal com delivery em Itapevi',
  description:
    'Cardápio da SR Burguer, hamburgueria artesanal com delivery em Itapevi/SP: lanches com carne artesanal de 120 g, combos com batata e refri e promoções. Peça pelo site.',
  themeColor: '#F5EEE3',
} as const;

/** URL canônica: domínio próprio (NEXT_PUBLIC_SITE_URL) ou a URL de produção da Vercel. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit && /^https?:\/\/[^/]+/.test(explicit) && !explicit.includes('seudominio')) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:3000';
}

export function absoluteUrl(path = '/'): string {
  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Loja com endereço de balcão. Sem rua (só delivery), o site mostra a área de entrega no lugar do endereço. */
export function hasStreetAddress(address: StoreSettings['address']): boolean {
  return address.street.trim().length > 0;
}

export function formatAddressLine(address: StoreSettings['address']): string {
  return [address.street, address.number, address.district].map((part) => part.trim()).filter(Boolean).join(', ');
}

export function formatCityLine(address: StoreSettings['address']): string {
  return `${address.city}/${address.state}`;
}

/** Linha pública de localização: endereço completo ou, na loja só de delivery, "Delivery em Cidade/UF". */
export function formatLocationLine(address: StoreSettings['address']): string {
  return hasStreetAddress(address) ? `${formatAddressLine(address)}, ${formatCityLine(address)}` : `Delivery em ${formatCityLine(address)}`;
}

export function mapsUrl(address: StoreSettings['address']): string {
  const query = [address.street, address.number, address.district, address.city, address.state]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function instagramUrl(handle: string): string | null {
  const clean = handle.replace(/^@/, '').trim();
  return clean ? `https://www.instagram.com/${clean}/` : null;
}
