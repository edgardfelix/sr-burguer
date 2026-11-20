'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ApiError, apiFetch } from '@/client/api';
import { connectRealtime, disconnectRealtime, listen, watchConnection } from '@/client/firebase-realtime';
import { whenIdle } from '@/client/idle';
import { getAudioState, sfx, subscribeAudioState, unlockAudio } from '@/client/sound';
import { STORAGE_KEYS, useStorageValue, writeStorage } from '@/client/storage';
import { formatBRL } from '@/lib/money';
import { normalizeCatalog, normalizeOrders, normalizeSettings } from '@/lib/normalize';
import { formatOrderNumber, FULFILLMENT_LABELS } from '@/lib/order';
import { businessDateOf } from '@/lib/schedule';
import { createDefaultSettings } from '@/lib/seed';
import type { Catalog, DailyReport, Order, OrderStatus, StoreSettings } from '@/lib/types';

type Driver = 'firebase' | 'local' | 'none';

interface SessionInfo {
  authenticated: boolean;
  email?: string;
  driver: Driver;
  realtime: 'firebase' | 'polling';
  firebaseToken: string | null;
  tutorialCompleted: boolean;
  problems: string[];
}

interface Meta {
  lastResetDate: string | null;
  tutorialCompletedAt: number | null;
}

interface Bootstrap {
  catalog: Catalog;
  settings: StoreSettings;
  orders: Order[];
  meta: Meta;
  reports: DailyReport[];
  businessDate: string;
  driver: Driver;
  problems: string[];
}

type AdminFetch = <T>(path: string, init?: RequestInit & { json?: unknown }) => Promise<T>;

interface AdminContextValue {
  phase: 'loading' | 'ready' | 'error';
  error: string | null;
  session: SessionInfo | null;
  catalog: Catalog;
  settings: StoreSettings;
  orders: Order[];
  reports: DailyReport[];
  businessDate: string;
  connected: boolean;
  realtimeMode: 'firebase' | 'polling';
  tutorialOpen: boolean;
  openTutorial: () => void;
  completeTutorial: () => Promise<void>;
  refresh: () => Promise<void>;
  adminFetch: AdminFetch;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  setSettingsLocal: (settings: StoreSettings) => void;
  logout: () => Promise<void>;
  sound: { enabled: boolean; toggle: () => void; audio: 'running' | 'locked'; unlock: () => Promise<void> };
  notifications: { permission: NotificationPermission | 'unsupported'; request: () => Promise<void> };
}

const AdminContext = createContext<AdminContextValue | null>(null);

const EMPTY_CATALOG: Catalog = { categories: {}, products: {} };
const POLL_MS = 3000;
const REPEAT_ALERT_MS = 30_000;

/** Evita re-renderizar o painel a cada consulta quando nada mudou. */
function sameOrders(a: Order[], b: Order[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((o, i) => o.id === b[i]?.id && o.status === b[i]?.status && o.updatedAt === b[i]?.updatedAt);
}

function readPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG);
  const [settings, setSettings] = useState<StoreSettings>(createDefaultSettings);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [meta, setMeta] = useState<Meta>({ lastResetDate: null, tutorialCompletedAt: null });
  const [businessDate, setBusinessDate] = useState('');
  const [connected, setConnected] = useState(true);
  const [realtimeFailed, setRealtimeFailed] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [, forceRender] = useState(0);

  const soundRaw = useStorageValue(STORAGE_KEYS.adminSound, null);
  const soundEnabled = soundRaw !== '"off"';
  const audio = useSyncExternalStore(subscribeAudioState, getAudioState, () => 'locked' as const);
  const permission = useSyncExternalStore(
    () => () => undefined,
    readPermission,
    () => 'default' as const,
  );

  const goToLogin = useCallback(() => router.replace('/admin/login'), [router]);

  const adminFetch = useCallback<AdminFetch>(
    async (path, init) => {
      try {
        return await apiFetch(path, init);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) goToLogin();
        throw e;
      }
    },
    [goToLogin],
  );

  const applyBootstrap = useCallback((data: Bootstrap) => {
    setCatalog(data.catalog);
    setSettings(data.settings);
    setOrders(data.orders);
    setReports(data.reports);
    setMeta(data.meta);
    setBusinessDate(data.businessDate);
  }, []);

  const refresh = useCallback(async () => {
    applyBootstrap(await adminFetch<Bootstrap>('/api/admin/bootstrap'));
  }, [adminFetch, applyBootstrap]);

  // ------------------------------------------------------------ carga inicial
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const info = await adminFetch<SessionInfo>('/api/auth/session');
        if (!info.authenticated) return goToLogin();
        const data = await adminFetch<Bootstrap>('/api/admin/bootstrap');
        if (cancelled) return;
        applyBootstrap(data);
        setSession(info);
        setTutorialOpen(!info.tutorialCompleted);
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Não foi possível carregar o painel.');
        setPhase('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [adminFetch, applyBootstrap, goToLogin]);

  const realtimeMode: 'firebase' | 'polling' = session?.realtime === 'firebase' && session.firebaseToken && !realtimeFailed ? 'firebase' : 'polling';

  // ------------------------------------------------------------ tempo real
  useEffect(() => {
    if (phase !== 'ready' || !session || !businessDate) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await adminFetch<{ orders: Order[]; businessDate: string }>('/api/admin/orders');
        if (cancelled) return;
        setOrders((prev) => (sameOrders(prev, data.orders) ? prev : data.orders));
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };

    if (realtimeMode === 'firebase' && session.firebaseToken) {
      const stops: Array<() => void> = [];
      // Ponte: enquanto o SDK baixa e conecta, a consulta a cada 3 s garante que nenhum pedido passe batido.
      let bridge = window.setInterval(poll, POLL_MS);
      const stopBridge = () => {
        window.clearInterval(bridge);
        bridge = 0;
      };
      const connect = async () => {
        try {
          const db = await connectRealtime(session.firebaseToken as string);
          if (cancelled) return;
          stops.push(
            await listen(db, {
              path: 'orders',
              equalTo: { child: 'businessDate', value: businessDate },
              onData: (value) => {
                stopBridge();
                setOrders(normalizeOrders(value));
              },
              onError: () => setRealtimeFailed(true),
            }),
          );
          stops.push(await listen(db, { path: 'catalog', onData: (value) => setCatalog(normalizeCatalog(value) ?? EMPTY_CATALOG) }));
          stops.push(await listen(db, { path: 'settings', onData: (value) => setSettings(normalizeSettings(value)) }));
          stops.push(
            await listen(db, {
              path: 'meta',
              onData: (value) => {
                const m = (value ?? {}) as Partial<Meta>;
                setMeta({ lastResetDate: m.lastResetDate ?? null, tutorialCompletedAt: m.tutorialCompletedAt ?? null });
              },
            }),
          );
          stops.push(await watchConnection(db, setConnected));
        } catch (e) {
          console.error('[painel] Falha no tempo real do Firebase', e);
          toast.error('Tempo real indisponível. O painel vai atualizar sozinho a cada 3 segundos.');
          if (!cancelled) setRealtimeFailed(true);
        }
      };
      // O SDK (cerca de 100 KB) só é baixado e iniciado depois da primeira pintura, no tempo ocioso.
      const cancelIdle = whenIdle(() => void connect(), { timeout: 1500 });
      return () => {
        cancelled = true;
        cancelIdle();
        stopBridge();
        stops.forEach((stop) => stop());
      };
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, session, businessDate, realtimeMode, adminFetch]);

  // ------------------------------------------------------------ alerta de pedido novo
  const knownIds = useRef<Set<string> | null>(null);
  const soundRef = useRef(soundEnabled);
  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (knownIds.current === null) {
      knownIds.current = new Set(orders.map((o) => o.id));
      return;
    }
    const fresh = orders.filter((o) => !knownIds.current?.has(o.id));
    fresh.forEach((o) => knownIds.current?.add(o.id));
    const incoming = fresh.filter((o) => o.status === 'novo');
    if (incoming.length === 0) return;
    if (soundRef.current) sfx.newOrder();
    for (const order of incoming) {
      const label = `Pedido ${formatOrderNumber(order.number)}`;
      const detail = `${order.customer.name} | ${FULFILLMENT_LABELS[order.fulfillment.type]} | ${formatBRL(order.total)}`;
      toast.success(`Novo ${label.toLowerCase()}`, { description: detail, duration: 8000 });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        try {
          new Notification(`Novo ${label.toLowerCase()} | SR Burguer`, { body: detail, tag: order.id, icon: '/icon.png' });
        } catch {
          /* navegador sem suporte a Notification no contexto atual */
        }
      }
    }
  }, [orders, phase]);

  const pendingCount = orders.filter((o) => o.status === 'novo').length;

  // Título da aba mostra quantos pedidos aguardam aceite.
  useEffect(() => {
    document.title = pendingCount ? `(${pendingCount}) Novo pedido | Painel SR Burguer` : 'Painel | SR Burguer';
  }, [pendingCount]);

  // Repete a campainha enquanto houver pedido sem aceite (opção da loja).
  useEffect(() => {
    if (!pendingCount || !settings.repeatAlert) return;
    const id = window.setInterval(() => {
      if (soundRef.current) sfx.newOrder();
    }, REPEAT_ALERT_MS);
    return () => window.clearInterval(id);
  }, [pendingCount, settings.repeatAlert]);

  // Libera o áudio no primeiro clique em qualquer lugar do painel.
  useEffect(() => {
    const unlock = () => void unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // ------------------------------------------------------------ reset diário (reserva do cron)
  const resetTried = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== 'ready') return;
    const check = async () => {
      const today = businessDateOf(Date.now());
      const stale = today !== businessDate || meta.lastResetDate !== today;
      if (!stale || resetTried.current === today) return;
      resetTried.current = today;
      try {
        await adminFetch('/api/admin/maintenance/reset', { method: 'POST' });
        await refresh();
      } catch {
        /* tenta de novo na próxima verificação do dia seguinte */
      }
    };
    void check();
    const id = window.setInterval(() => void check(), 60_000);
    return () => window.clearInterval(id);
  }, [phase, businessDate, meta.lastResetDate, adminFetch, refresh]);

  // ------------------------------------------------------------ ações
  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const now = Date.now();
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, updatedAt: now, statusHistory: { ...o.statusHistory, [status]: now } } : o)));
      try {
        await adminFetch(`/api/admin/orders/${id}/status`, { method: 'PATCH', json: { status } });
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Não foi possível atualizar o pedido.');
        await refresh().catch(() => undefined);
      }
    },
    [adminFetch, refresh],
  );

  const completeTutorial = useCallback(async () => {
    setTutorialOpen(false);
    try {
      await adminFetch('/api/admin/tutorial/complete', { method: 'POST' });
    } catch {
      /* o tutorial reaparece no próximo acesso */
    }
  }, [adminFetch]);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    await disconnectRealtime().catch(() => undefined);
    router.replace('/admin/login');
    router.refresh();
  }, [router]);

  const value = useMemo<AdminContextValue>(
    () => ({
      phase,
      error,
      session,
      catalog,
      settings,
      orders,
      reports,
      businessDate,
      connected,
      realtimeMode,
      tutorialOpen,
      openTutorial: () => setTutorialOpen(true),
      completeTutorial,
      refresh,
      adminFetch,
      updateOrderStatus,
      setSettingsLocal: setSettings,
      logout,
      sound: {
        enabled: soundEnabled,
        toggle: () => {
          writeStorage(STORAGE_KEYS.adminSound, soundEnabled ? 'off' : 'on');
          if (!soundEnabled) void unlockAudio().then(() => sfx.newOrder());
        },
        audio,
        unlock: async () => {
          await unlockAudio();
          sfx.newOrder();
        },
      },
      notifications: {
        permission,
        request: async () => {
          if (typeof Notification === 'undefined') return;
          await Notification.requestPermission();
          forceRender((n) => n + 1);
        },
      },
    }),
    [phase, error, session, catalog, settings, orders, reports, businessDate, connected, realtimeMode, tutorialOpen, completeTutorial, refresh, adminFetch, updateOrderStatus, logout, soundEnabled, audio, permission],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin precisa estar dentro de <AdminDataProvider>.');
  return value;
}
