import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SR Burguer',
    short_name: 'SR Burguer',
    description: SITE.description,
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: SITE.themeColor,
    theme_color: SITE.themeColor,
    categories: ['food', 'shopping'],
    icons: [
      { src: '/images/marca/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    ],
  };
}
