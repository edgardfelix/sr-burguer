'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useMenuUi } from '@/client/cart-store';
import { whenIdle } from '@/client/idle';
import { CookieNotice } from './CookieNotice';
import { MobileCartBar } from './MobileCartBar';

/*
 * Painéis do fluxo de compra (item, carrinho, entrega e pagamento, acompanhamento) ficam fora do
 * pacote inicial: o código deles (Vaul, Radix, validação, jogo) não atrasa a primeira pintura.
 * São baixados no tempo ocioso depois do carregamento ou no primeiro toque, o que vier antes.
 */
const ProductSheet = dynamic(() => import('./ProductSheet').then((m) => m.ProductSheet), { ssr: false });
const CartPanel = dynamic(() => import('./CartPanel').then((m) => m.CartPanel), { ssr: false });
const CheckoutPanel = dynamic(() => import('./CheckoutPanel').then((m) => m.CheckoutPanel), { ssr: false });
const SuccessPanel = dynamic(() => import('./SuccessPanel').then((m) => m.SuccessPanel), { ssr: false });

const preloadPanels = () => Promise.all([import('./ProductSheet'), import('./CartPanel'), import('./CheckoutPanel'), import('./SuccessPanel')]);

export function CartLayer() {
  const productId = useMenuUi((s) => s.productId);
  const panel = useMenuUi((s) => s.panel);
  const [preloaded, setPreloaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Monta uma vez e não desmonta mais: as animações de saída dos painéis continuam funcionando.
  if (!mounted && (preloaded || productId !== null || panel !== null)) setMounted(true);

  useEffect(
    () =>
      whenIdle(() => {
        preloadPanels()
          .then(() => setPreloaded(true))
          .catch(() => undefined);
      }),
    [],
  );

  return (
    <>
      {mounted ? (
        <>
          <ProductSheet />
          <CartPanel />
          <CheckoutPanel />
          <SuccessPanel />
        </>
      ) : null}
      <MobileCartBar />
      <CookieNotice />
    </>
  );
}
