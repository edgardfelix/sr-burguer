import type { Metadata } from 'next';
import { StoreSettingsForm } from '@/components/admin/StoreSettingsForm';

export const metadata: Metadata = { title: 'Loja e horário' };

export default function LojaPage() {
  return <StoreSettingsForm />;
}
