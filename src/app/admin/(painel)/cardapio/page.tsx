import type { Metadata } from 'next';
import { MenuManager } from '@/components/admin/MenuManager';

export const metadata: Metadata = { title: 'Cardápio' };

export default function CardapioPage() {
  return <MenuManager />;
}
