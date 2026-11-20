import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

const LEGAL_UPDATED = new Date('2026-11-15T12:00:00-03:00');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), lastModified: new Date(), changeFrequency: 'daily', priority: 1, images: [absoluteUrl('/images/marca/burger-montado.jpg')] },
    { url: absoluteUrl('/politica-de-privacidade'), lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/termos-de-uso'), lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/politica-de-cookies'), lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
