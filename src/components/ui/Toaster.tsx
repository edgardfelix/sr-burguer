'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { whenIdle } from '@/client/idle';

/** sonner fica fora do pacote inicial: as notificações só aparecem depois de alguma ação. */
const Sonner = dynamic(() => import('sonner').then((m) => m.Toaster), { ssr: false });

export function Toaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => whenIdle(() => setReady(true), { timeout: 2000 }), []);

  if (!ready) return null;
  return (
    <Sonner
      position="top-center"
      offset={{ top: 80 }}
      mobileOffset={{ top: 76 }}
      visibleToasts={3}
      containerAriaLabel="Notificações"
      toastOptions={{ duration: 3200 }}
    />
  );
}
