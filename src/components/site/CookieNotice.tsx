'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { useCart } from '@/client/cart-store';
import { STORAGE_KEYS, useStorageValue, writeStorage } from '@/client/storage';
import { c, ease, mq, radius } from '@/styles/tokens';
import { Button } from '../ui/Button';

/** Aviso de armazenamento local (LGPD). O site não usa cookies de rastreamento nem de anúncios. */
export function CookieNotice() {
  // No servidor o aviso fica oculto; no navegador aparece até ser fechado.
  const dismissed = useStorageValue(STORAGE_KEYS.cookies, 'server');
  const hasCart = useCart((s) => s.lines.length > 0);

  if (dismissed !== null) return null;

  return (
    <Notice role="region" aria-label="Aviso sobre cookies" data-raised={hasCart}>
      <p>
        Seu pedido e seus dados de entrega ficam salvos só neste aparelho. Sem cookies de anúncios. <Link href="/politica-de-cookies">Política de cookies</Link>
      </p>
      <Button
        type="button"
        data-size="sm"
        onClick={() => writeStorage(STORAGE_KEYS.cookies, true)}
      >
        Fechar aviso
      </Button>
    </Notice>
  );
}

const Notice = styled.div`
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 44;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 16px;
  border: 1px solid ${c.line};
  border-radius: ${radius.lg};
  background: ${c.surface};
  box-shadow: 0 16px 40px -16px rgba(23, 17, 13, 0.4);
  font-size: 0.875rem;
  line-height: 1.4;
  animation: bb-notice-in 420ms ${ease.out} both;

  &[data-raised='true'] {
    bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  }

  p {
    flex: 1;
    color: ${c.inkSoft};
  }

  a {
    font-weight: 600;
    color: ${c.ink};
  }

  button {
    flex: none;
  }

  ${mq.md} {
    left: auto;
    right: 24px;
    bottom: 24px;
    width: 420px;

    &[data-raised='true'] {
      bottom: 24px;
    }
  }

  @keyframes bb-notice-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
`;
