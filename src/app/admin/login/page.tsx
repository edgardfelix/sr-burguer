import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginScreen } from '@/components/admin/LoginScreen';
import { getAdminSession } from '@/server/admin-session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Entrar',
};

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin/pedidos');
  return <LoginScreen />;
}
