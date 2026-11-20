'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCart, useCustomer, useTrackedOrder } from '@/client/cart-store';
import { useStoreStatus } from '@/client/hooks';
import type { Catalog, StoreSettings, StoreStatus } from '@/lib/types';
import { useSoundStore } from './SoundToggle';

interface StoreContextValue {
  catalog: Catalog;
  settings: StoreSettings;
  status: StoreStatus;
  now: number;
  ready: boolean;
  refreshMenu: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/** Cardápio, configurações e status da loja compartilhados pelos componentes do cliente. */
export function StoreProvider({
  catalog: initialCatalog,
  settings: initialSettings,
  renderedAt,
  children,
}: {
  catalog: Catalog;
  settings: StoreSettings;
  renderedAt: number;
  children: ReactNode;
}) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [settings, setSettings] = useState(initialSettings);
  const { status, now, ready } = useStoreStatus(settings, renderedAt);

  useEffect(() => {
    void useCart.persist.rehydrate();
    void useCustomer.persist.rehydrate();
    void useSoundStore.persist.rehydrate();
    void useTrackedOrder.persist.rehydrate();
  }, []);

  const refreshMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/menu', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { catalog: Catalog; settings: StoreSettings };
      setCatalog(data.catalog);
      setSettings(data.settings);
    } catch {
      /* mantém os dados atuais */
    }
  }, []);

  const value = useMemo(() => ({ catalog, settings, status, now, ready, refreshMenu }), [catalog, settings, status, now, ready, refreshMenu]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore precisa estar dentro de <StoreProvider>.');
  return value;
}
