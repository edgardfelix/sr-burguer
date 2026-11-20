'use client';

import { useEffect, useEffectEvent } from 'react';
import { isFinalStatus } from '@/lib/order';
import type { OrderStatus, OrderTracking } from '@/lib/types';
import { ApiError, apiFetch } from './api';
import { useTrackedOrder } from './cart-store';

/** Com a tela de acompanhamento aberta. */
const FAST_MS = 8_000;
/** Só o indicador do topo visível. */
const SLOW_MS = 30_000;
/** Depois de falhas seguidas (sem internet), espera mais antes de tentar de novo. */
const BACKOFF_MS = 45_000;
/** Pedidos mais antigos que isto não são mais consultados. */
const MAX_AGE_MS = 6 * 60 * 60_000;

/**
 * Consulta o andamento do último pedido enquanto ele estiver em aberto.
 * Pausa com a aba escondida, consulta assim que ela volta e para quando o pedido termina.
 * `onStatusChange` recebe cada mudança real de status (som, vibração, aviso).
 */
export function useOrderTrackingSync(fast: boolean, onStatusChange?: (status: OrderStatus, previous: OrderStatus) => void) {
  const order = useTrackedOrder((s) => s.order);
  const lost = useTrackedOrder((s) => s.lost);
  const notify = useEffectEvent((status: OrderStatus, previous: OrderStatus) => onStatusChange?.(status, previous));

  const id = order?.id;
  const token = order?.trackToken;
  const createdAt = order?.createdAt ?? 0;
  const finished = order ? isFinalStatus(order.status) : true;

  useEffect(() => {
    if (!id || !token || finished || lost) return;
    let stopped = false;
    let timer = 0;
    let failures = 0;

    const schedule = (ms: number) => {
      window.clearTimeout(timer);
      if (!stopped) timer = window.setTimeout(tick, ms);
    };

    async function tick() {
      if (stopped) return;
      if (Date.now() - createdAt > MAX_AGE_MS) return;
      if (document.visibilityState !== 'visible') return; // retoma no visibilitychange
      try {
        const { tracking } = await apiFetch<{ tracking: OrderTracking }>(`/api/orders/${encodeURIComponent(id as string)}/tracking?t=${encodeURIComponent(token as string)}`);
        if (stopped) return;
        failures = 0;
        const previous = useTrackedOrder.getState().order?.status;
        useTrackedOrder.getState().applyTracking(tracking);
        if (previous && previous !== tracking.status) notify(tracking.status, previous);
        if (isFinalStatus(tracking.status)) return;
      } catch (error) {
        if (stopped) return;
        if (error instanceof ApiError && error.status === 404) {
          useTrackedOrder.getState().markLost();
          return;
        }
        failures += 1;
      }
      schedule(failures >= 3 ? BACKOFF_MS : fast ? FAST_MS : SLOW_MS);
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule(0);
    };

    // Abrir a tela de acompanhamento consulta na hora; o indicador do topo começa com calma.
    schedule(fast ? 0 : 1500);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [id, token, createdAt, finished, lost, fast]);
}
