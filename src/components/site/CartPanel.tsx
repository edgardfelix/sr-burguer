'use client';

import { AlertTriangle, CupSoda, ShoppingBag, X } from 'lucide-react';
import Image from 'next/image';
import styled from 'styled-components';
import { useCart, useMenuUi, type CartLine } from '@/client/cart-store';
import { sfx } from '@/client/sound';
import { formatBRL } from '@/lib/money';
import { c, font, radius } from '@/styles/tokens';
import { Button, IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Stepper } from '../ui/Stepper';
import { SoundToggle, useSound } from './SoundToggle';
import { useStore } from './StoreProvider';
import { useCartSummary, type CartItemView } from './useCartSummary';

function drinkLine(item: CartItemView): { text: string; tone?: 'error' } | null {
  if (!item.choice) return null;
  if (item.issue === 'drink-unavailable') return { text: 'A bebida escolhida acabou. Troque a bebida.', tone: 'error' };
  if (item.issue === 'drink-missing') return { text: 'Escolha a bebida do combo.', tone: 'error' };
  return { text: item.drink ? `Bebida: ${item.drink.name}` : 'Bebida: sem preferência' };
}

export function CartPanel() {
  const { settings } = useStore();
  const panel = useMenuUi((s) => s.panel);
  const openPanel = useMenuUi((s) => s.openPanel);
  const openProduct = useMenuUi((s) => s.openProduct);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const { items, count, subtotal, blocked } = useCartSummary();
  const { enabled: soundOn } = useSound();

  const changeQuantity = (key: string, quantity: number, previous: number) => {
    setQuantity(key, quantity);
    if (soundOn) (quantity < previous ? sfx.remove : sfx.tick)();
  };

  // Fecha o carrinho e abre o item com os dados da linha; ao salvar, a linha é trocada no mesmo lugar.
  const editLine = (line: CartLine) => {
    openPanel(null);
    openProduct(line.productId, line);
  };

  const belowMinimum = settings.acceptsDelivery && settings.minOrder > 0 && subtotal < settings.minOrder;
  const unavailableCount = blocked.filter((i) => i.issue === 'unavailable').length;

  return (
    <Sheet
      open={panel === 'cart'}
      onOpenChange={(open) => openPanel(open ? 'cart' : null)}
      title="Seu pedido"
      headerExtra={<SoundToggle />}
      footer={
        count > 0 ? (
          <Footer>
            <Row>
              <span>Subtotal</span>
              <strong>{formatBRL(subtotal)}</strong>
            </Row>
            <Small>
              {settings.acceptsDelivery
                ? settings.deliveryFee === null
                  ? `Taxa de entrega combinada pelo WhatsApp.${settings.acceptsPickup ? ' Retirada no balcão sem taxa.' : ''}`
                  : `Entrega: ${formatBRL(settings.deliveryFee)}.${settings.acceptsPickup ? ' Retirada no balcão sem taxa.' : ''}`
                : 'Pedidos só para retirada no balcão no momento.'}
              {belowMinimum ? ` Pedido mínimo para entrega: ${formatBRL(settings.minOrder)}.` : ''}
            </Small>
            <Button type="button" data-block="true" data-size="lg" disabled={blocked.length > 0} onClick={() => openPanel('checkout')}>
              Finalizar pedido
            </Button>
          </Footer>
        ) : undefined
      }
    >
      {count === 0 ? (
        <Empty>
          <ShoppingBag aria-hidden />
          <p>Seu pedido está vazio.</p>
          <span>Toque em um item do cardápio para adicionar.</span>
          <Button type="button" data-variant="secondary" onClick={() => openPanel(null)}>
            Ver cardápio
          </Button>
        </Empty>
      ) : (
        <>
          {blocked.length > 0 ? (
            <Warning role="alert">
              <AlertTriangle aria-hidden />
              <p>
                {unavailableCount > 0
                  ? 'Alguns itens saíram do cardápio ou estão pausados. Remova-os para continuar.'
                  : 'Escolha ou troque a bebida dos combos marcados para continuar.'}
              </p>
            </Warning>
          ) : null}
          <List role="list">
            {items.map((item) => {
              const { line, product, unitPrice, available } = item;
              const drink = drinkLine(item);
              return (
                <Item key={line.key} data-unavailable={!available}>
                  {product?.image ? (
                    <Thumb data-contain={product.imageContain || undefined}>
                      <Image src={product.image} alt="" fill sizes="64px" unoptimized={product.image.startsWith('/api/media/')} />
                    </Thumb>
                  ) : (
                    <Thumb aria-hidden />
                  )}
                  <Body>
                    <Name>{product?.name ?? 'Item indisponível'}</Name>
                    {available && drink ? (
                      <DrinkRow data-tone={drink.tone}>
                        <CupSoda aria-hidden />
                        <span>{drink.text}</span>
                        <button type="button" onClick={() => editLine(line)} aria-label={`${drink.tone ? 'Escolher' : 'Trocar'} a bebida de ${product?.name ?? 'combo'}`}>
                          {drink.tone ? 'Escolher' : 'Trocar'}
                        </button>
                      </DrinkRow>
                    ) : null}
                    {line.note ? <Note>Obs.: {line.note}</Note> : null}
                    {available ? (
                      <Meta>
                        <span>{formatBRL(unitPrice)} cada</span>
                        <strong>{formatBRL(unitPrice * line.quantity)}</strong>
                      </Meta>
                    ) : (
                      <Note data-tone="error">Indisponível no momento</Note>
                    )}
                  </Body>
                  <Controls>
                    {available ? (
                      <Stepper
                        size="sm"
                        removable
                        min={0}
                        value={line.quantity}
                        label={`Quantidade de ${product?.name ?? 'item'}`}
                        onChange={(v) => changeQuantity(line.key, v, line.quantity)}
                      />
                    ) : (
                      <IconButton type="button" data-size="sm" aria-label="Remover item" onClick={() => remove(line.key)}>
                        <X aria-hidden />
                      </IconButton>
                    )}
                  </Controls>
                </Item>
              );
            })}
          </List>
        </>
      )}
    </Sheet>
  );
}

const Footer = styled.div`
  display: grid;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 1.0625rem;

  strong {
    font-size: 1.25rem;
    font-variant-numeric: tabular-nums;
  }
`;

const Small = styled.p`
  font-size: 0.875rem;
  color: ${c.muted};
`;

const Empty = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 40px 0 24px;
  text-align: center;

  svg {
    width: 36px;
    height: 36px;
    color: ${c.amberInk};
  }

  p {
    font-family: ${font.display};
    font-size: 1.375rem;
    font-weight: 600;
  }

  span {
    color: ${c.muted};
    margin-bottom: 8px;
  }
`;

const Warning = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: ${radius.md};
  background: ${c.redSoft};
  color: ${c.ink};
  font-size: 0.9375rem;

  svg {
    flex: none;
    width: 20px;
    height: 20px;
    color: ${c.red};
  }
`;

const List = styled.ul`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Item = styled.li`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  grid-template-areas:
    'thumb body'
    'thumb controls';
  gap: 8px 14px;
  padding: 14px 0;
  border-bottom: 1px solid ${c.line};

  &:last-of-type {
    border-bottom: 0;
  }

  &[data-unavailable='true'] {
    opacity: 0.75;
  }

  @media (min-width: 420px) {
    grid-template-columns: 56px minmax(0, 1fr) auto;
    grid-template-areas: 'thumb body controls';
    align-items: center;
  }
`;

const Thumb = styled.div`
  grid-area: thumb;
  position: relative;
  overflow: hidden;
  width: 56px;
  height: 56px;
  border-radius: ${radius.sm};
  background: ${c.paper2};

  img {
    object-fit: cover;
  }
  &[data-contain] img {
    object-fit: contain;
    padding: 4px;
  }
`;

const Body = styled.div`
  grid-area: body;
  display: grid;
  gap: 2px;
  min-width: 0;
`;

const Name = styled.p`
  font-weight: 650;
  line-height: 1.3;
`;

const DrinkRow = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: ${c.inkSoft};

  svg {
    flex: none;
    width: 15px;
    height: 15px;
    color: ${c.amberInk};
  }

  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  button {
    flex: none;
    min-height: 32px;
    margin-left: 2px;
    padding: 0 6px;
    border: 0;
    border-radius: ${radius.xs};
    background: transparent;
    color: ${c.ink};
    font-size: 0.875rem;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  &[data-tone='error'] {
    color: ${c.red};
    font-weight: 600;

    svg {
      color: ${c.red};
    }
  }
`;

const Note = styled.p`
  font-size: 0.875rem;
  color: ${c.muted};
  overflow-wrap: anywhere;

  &[data-tone='error'] {
    color: ${c.red};
    font-weight: 600;
  }
`;

const Meta = styled.p`
  display: flex;
  gap: 10px;
  font-size: 0.9375rem;
  color: ${c.muted};
  font-variant-numeric: tabular-nums;

  strong {
    color: ${c.ink};
  }
`;

const Controls = styled.div`
  grid-area: controls;
  justify-self: start;

  @media (min-width: 420px) {
    justify-self: end;
  }
`;
