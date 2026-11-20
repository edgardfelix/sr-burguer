import { redirect } from 'next/navigation';
import { getAdminSession } from '@/server/admin-session';

export const dynamic = 'force-dynamic';

export default async function AdminIndex() {
  const session = await getAdminSession();
  redirect(session ? '/admin/pedidos' : '/admin/login');
}
