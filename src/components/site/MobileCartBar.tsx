'use client';

import { ChevronRight, ShoppingBag } from 'lucide-react';
import styled from 'styled-components';
import { useMenuUi } from '@/client/cart-store';
import { formatBRL } from '@/lib/money';
import { c, ease, mq, radius } from '@/styles/tokens';
import { useCartSummary } from './useCartSummary';

/** Barra do pedido no polegar (só no celular), escondida enquanto um painel está aberto. */
export function MobileCartBar() {
  const { count, subtotal } = useCartSummary();
  const panel = useMenuUi((s) => s.panel);
  const productId = useMenuUi((s) => s.productId);
  const openPanel = useMenuUi((s) => s.openPanel);
  const visible = count > 0 && panel === null && productId === null;

  return (
    <Bar data-cart-bar={visible ? 'visible' : 'hidden'} aria-hidden={!visible}>
      <button type="button" tabIndex={visible ? 0 : -1} onClick={() => openPanel('cart')}>
        <ShoppingBag aria-hidden />
        <span>
          Ver pedido <small>{count === 1 ? '1 item' : `${count} itens`}</small>
        </span>
        <strong>{formatBRL(subtotal)}</strong>
        <ChevronRight aria-hidden />
      </button>
    </Bar>
  );
}

const Bar = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 45;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
  transform: translateY(110%);
  transition: transform 320ms ${ease.drawer};

  &[data-cart-bar='visible'] {
    transform: translateY(0);
  }

  button {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 0 16px;
    border: 0;
    border-radius: ${radius.md};
    background: ${c.ink};
    color: ${c.paper};
    font-size: 1rem;
    font-weight: 600;
    text-align: left;
    box-shadow: 0 12px 32px -12px rgba(23, 17, 13, 0.6);
    cursor: pointer;
    transition: transform 160ms ${ease.out};
  }

  button:active {
    transform: scale(0.98);
  }

  span {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  small {
    font-size: 0.875rem;
    font-weight: 500;
    color: ${c.creamMuted};
  }

  strong {
    font-variant-numeric: tabular-nums;
  }

  svg {
    width: 20px;
    height: 20px;
    flex: none;
  }

  ${mq.md} {
    display: none;
  }
`;
