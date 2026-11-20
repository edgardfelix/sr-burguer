'use client';

import { Bike, ChefHat, CircleX, ClipboardCheck, PackageCheck, Store, type LucideProps } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { isTrackingRelevant, useMenuUi, useTrackedOrder } from '@/client/cart-store';
import { useHydrated } from '@/client/hooks';
import { useOrderTrackingSync } from '@/client/order-tracking';
import { haptic, sfx } from '@/client/sound';
import { formatOrderNumber, trackingLabel } from '@/lib/order';
import type { FulfillmentType, OrderStatus } from '@/lib/types';
import { c, ease, mq, radius } from '@/styles/tokens';
import { useSound } from './SoundToggle';
import { useStore } from './StoreProvider';

/** Ícone de cada etapa do pedido (entrega e retirada têm ícones próprios na etapa "despachado"). */
export function StatusIcon({ status, fulfillment, ...props }: { status: OrderStatus; fulfillment: FulfillmentType } & LucideProps) {
  switch (status) {
    case 'novo':
      return <ClipboardCheck {...props} />;
    case 'preparando':
      return <ChefHat {...props} />;
    case 'despachado':
      return fulfillment === 'delivery' ? <Bike {...props} /> : <Store {...props} />;
    case 'concluido':
      return <PackageCheck {...props} />;
    case 'cancelado':
      return <CircleX {...props} />;
  }
}

/**
 * Atalho no topo para acompanhar o último pedido (some no fim do dia ou 30 min depois de concluído).
 * Também mantém o status atualizado e avisa com som e vibração quando ele muda.
 */
export function TrackOrderButton() {
  const { now } = useStore();
  const hydrated = useHydrated();
  const order = useTrackedOrder((s) => s.order);
  const lost = useTrackedOrder((s) => s.lost);
  const panel = useMenuUi((s) => s.panel);
  const openPanel = useMenuUi((s) => s.openPanel);
  const { enabled: soundOn } = useSound();
  const [announcement, setAnnouncement] = useState('');

  useOrderTrackingSync(panel === 'success', (status, _previous) => {
    if (!order) return;
    if (soundOn) (status === 'cancelado' ? sfx.error : sfx.success)();
    haptic(status === 'cancelado' ? [20, 60, 20] : [10, 50, 10]);
    setAnnouncement(`Pedido ${formatOrderNumber(order.number)}: ${trackingLabel(status, order.fulfillment.type)}.`);
  });

  if (!hydrated || !isTrackingRelevant(order, now, lost)) {
    return (
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    );
  }

  const label = trackingLabel(order.status, order.fulfillment.type);

  return (
    <>
      <Button
        type="button"
        data-track-button
        data-status={order.status}
        onClick={() => openPanel('success')}
        aria-label={`Acompanhar pedido ${formatOrderNumber(order.number)}: ${label}`}
      >
        {/* key: o ícone remonta a cada mudança de status e a marcação de "novidade" roda uma vez. */}
        <StatusIcon key={order.status} status={order.status} fulfillment={order.fulfillment.type} aria-hidden />
        <span data-number>{formatOrderNumber(order.number)}</span>
        <span data-label>{label}</span>
      </Button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid ${c.lineStrong};
  border-radius: ${radius.md};
  background: ${c.surface};
  color: ${c.ink};
  font-weight: 700;
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    transform 160ms ${ease.out},
    border-color 160ms ease,
    background-color 160ms ease;

  svg {
    flex: none;
    width: 19px;
    height: 19px;
    color: ${c.amberInk};
    animation: bb-status-in 520ms ${ease.out};
  }

  &[data-status='despachado'] svg,
  &[data-status='concluido'] svg {
    color: ${c.green};
  }
  &[data-status='cancelado'] svg {
    color: ${c.red};
  }

  span[data-label] {
    display: none;
    font-weight: 600;
    color: ${c.inkSoft};
  }

  ${mq.sm} {
    span[data-label] {
      display: inline;
    }
  }

  &:active {
    transform: scale(0.97);
  }

  ${mq.hover} {
    &:hover {
      border-color: ${c.ink};
    }
  }

  @keyframes bb-status-in {
    from {
      transform: scale(0.6);
      opacity: 0.2;
    }
    to {
      transform: none;
      opacity: 1;
    }
  }

  ${mq.reduced} {
    svg {
      animation: none;
    }
  }
`;
