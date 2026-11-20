import type { Metadata } from 'next';
import { PromotionsManager } from '@/components/admin/PromotionsManager';

export const metadata: Metadata = { title: 'Promoções' };

export default function PromocoesPage() {
  return <PromotionsManager />;
}
