import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { preconnect } from 'react-dom';
import { AdminShell } from '@/components/admin/AdminShell';
import { firebasePublicConfig, isFirebasePublicConfigured } from '@/lib/firebase-public';
import { getAdminSession } from '@/server/admin-session';

export const dynamic = 'force-dynamic';

/** Todas as páginas do painel exigem sessão válida (verificada no servidor a cada navegação). */
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  // O SDK do Firebase só é baixado depois da primeira pintura; a conexão TLS já fica aberta antes.
  if (isFirebasePublicConfigured()) {
    preconnect(new URL(firebasePublicConfig.databaseURL).origin);
    preconnect('https://identitytoolkit.googleapis.com');
  }

  return <AdminShell email={session.sub}>{children}</AdminShell>;
}
