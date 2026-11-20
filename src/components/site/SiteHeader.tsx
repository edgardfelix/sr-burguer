'use client';

import { ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useCart, useMenuUi } from '@/client/cart-store';
import { useHydrated } from '@/client/hooks';
import { effectivePrice } from '@/lib/catalog';
import { formatBRL } from '@/lib/money';
import { c, ease, layout, mq, radius } from '@/styles/tokens';
import { Logo } from './Logo';
import { StatusBadge } from './StatusBadge';
import { useStore } from './StoreProvider';
import { TrackOrderButton } from './TrackOrderButton';

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${c.paper};
  border-bottom: 1px solid transparent;
  transition: border-color 200ms ease;
  padding-top: env(safe-area-inset-top, 0px);

  &[data-scrolled='true'] {
    border-bottom-color: ${c.line};
  }
`;

const Inner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  ${mq.sm} {
    gap: 12px;
  }

  /* Celular estreito com pedido em andamento: o atalho do pedido ganha o espaço do nome (o logo continua). */
  @media (max-width: 479px) {
    &:has([data-track-button]) [data-wordmark] {
      display: none;
    }
  }
  height: ${layout.header};
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};
`;

const Home = styled.a`
  display: inline-flex;
  min-width: 0;
  text-decoration: none;
  border-radius: 6px;
`;

const Status = styled.div`
  display: none;
  ${mq.md} {
    display: flex;
    margin-left: 8px;
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

const CartButton = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid ${c.lineStrong};
  border-radius: ${radius.md};
  background: transparent;
  color: ${c.ink};
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition:
    transform 160ms ${ease.out},
    background-color 160ms ease,
    border-color 160ms ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:active {
    transform: scale(0.97);
  }

  ${mq.hover} {
    &:hover {
      border-color: ${c.ink};
      background: rgba(28, 22, 17, 0.04);
    }
  }

  span[data-total] {
    display: none;
    font-variant-numeric: tabular-nums;
    ${mq.sm} {
      display: inline;
    }
  }
`;

const Count = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 4px;
  background: ${c.ink};
  color: ${c.paper};
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;

  &[data-bump='true'] {
    animation: bb-bump 320ms ${ease.out};
  }

  @keyframes bb-bump {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.22);
    }
    100% {
      transform: scale(1);
    }
  }
`;

export function SiteHeader() {
  const { status, now, ready, catalog, settings } = useStore();
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const openPanel = useMenuUi((s) => s.openPanel);
  const [scrolled, setScrolled] = useState(false);

  const count = hydrated ? lines.reduce((n, l) => n + l.quantity, 0) : 0;
  const total = hydrated
    ? lines.reduce((sum, l) => {
        const product = catalog.products[l.productId];
        return product ? sum + effectivePrice(product, now) * l.quantity : sum;
      }, 0)
    : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Bar data-scrolled={scrolled}>
      <Inner>
        <Home href="#inicio" aria-label="SR Burguer, voltar ao início">
          <Logo size={40} src={settings.logo} />
        </Home>
        <Status>
          <StatusBadge status={status} now={now} ready={ready} detail={false} />
        </Status>
        <Spacer />
        <TrackOrderButton />
        <CartButton type="button" onClick={() => openPanel('cart')} aria-label={count ? `Ver pedido, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Ver pedido'}>
          <ShoppingBag aria-hidden />
          {count > 0 ? (
            <>
              <span data-total>{formatBRL(total)}</span>
              {/* key muda a cada alteração: o elemento remonta e a animação de "pulso" roda uma vez. */}
              <Count key={count} data-bump="true">
                {count}
              </Count>
            </>
          ) : (
            <span>Pedido</span>
          )}
        </CartButton>
      </Inner>
    </Bar>
  );
}
