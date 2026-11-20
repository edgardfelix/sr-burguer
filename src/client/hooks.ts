'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { computeStoreStatus } from '@/lib/schedule';
import type { StoreMode, StoreSettings, StoreStatus } from '@/lib/types';
import { whenIdle } from './idle';

export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

const noopSubscribe = () => () => undefined;

/** true somente no navegador, depois da hidratação. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// ------------------------------------------------------------------ relógio compartilhado

const CLOCK_INTERVAL_MS = 30_000;
const clock = { now: 0, timer: 0, listeners: new Set<() => void>() };

function tickClock() {
  clock.now = Date.now();
  clock.listeners.forEach((listener) => listener());
}

function onVisibility() {
  if (document.visibilityState === 'visible') tickClock();
}

function subscribeClock(listener: () => void) {
  clock.listeners.add(listener);
  if (clock.listeners.size === 1) {
    clock.timer = window.setInterval(tickClock, CLOCK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
  }
  return () => {
    clock.listeners.delete(listener);
    if (clock.listeners.size === 0) {
      window.clearInterval(clock.timer);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}

function readClock() {
  if (!clock.now) clock.now = Date.now();
  return clock.now;
}

/** Relógio do aparelho (atualiza a cada 30 s). No servidor e na hidratação usa o horário da renderização. */
export function useNow(serverNow: number): number {
  return useSyncExternalStore(subscribeClock, readClock, () => serverNow);
}

/**
 * Status da loja: calculado no navegador a partir do horário e do modo,
 * e confirmado na API a cada minuto (o painel pode abrir ou fechar manualmente).
 */
export function useStoreStatus(settings: Pick<StoreSettings, 'hours' | 'mode'>, renderedAt: number) {
  const now = useNow(renderedAt);
  const hydrated = useHydrated();
  const [remoteMode, setRemoteMode] = useState<StoreMode | null>(null);
  const lastFetch = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (Date.now() - lastFetch.current < 20_000) return;
      lastFetch.current = Date.now();
      try {
        const res = await fetch('/api/store/status', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { mode: StoreMode };
        if (!cancelled) setRemoteMode(data.mode);
      } catch {
        /* offline: mantém o cálculo local */
      }
    };
    // A primeira confirmação espera a página carregar: não disputa rede com o pôster (LCP).
    const cancelFirst = whenIdle(() => void refresh(), { timeout: 4000 });
    const id = window.setInterval(refresh, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      cancelFirst();
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const status: StoreStatus = computeStoreStatus({ hours: settings.hours, mode: remoteMode ?? settings.mode }, now);
  return { status, now, ready: hydrated };
}
