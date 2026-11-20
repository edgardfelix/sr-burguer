'use client';

import { Info, Megaphone } from 'lucide-react';
import { useMemo } from 'react';
import styled from 'styled-components';
import { useCart, useMenuUi } from '@/client/cart-store';
import { haptic, sfx } from '@/client/sound';
import { buildMenuSections, drinkChoiceFor } from '@/lib/catalog';
import { describeStatus } from '@/lib/schedule';
import { c, font, layout, mq, radius } from '@/styles/tokens';
import { CategoryNav } from './CategoryNav';
import { ProductCard } from './ProductCard';
import { useSound } from './SoundToggle';
import { useStore } from './StoreProvider';

export function Menu() {
  const { catalog, settings, now, status, ready } = useStore();
  const sections = useMemo(() => buildMenuSections(catalog, now), [catalog, now]);
  const add = useCart((s) => s.add);
  const openProduct = useMenuUi((s) => s.openProduct);
  const { enabled: soundOn } = useSound();
  const closed = ready && !status.isOpen;

  return (
    <Root id="cardapio">
      <CategoryNav sections={sections} />
      <Wrap>
        {settings.announcement.active && settings.announcement.text ? (
          <Notice data-tone="info">
            <Megaphone aria-hidden />
            <p>{settings.announcement.text}</p>
          </Notice>
        ) : null}
        {closed ? (
          <Notice data-tone="closed" role="status">
            <Info aria-hidden />
            <p>
              <strong>{describeStatus(status, now).title}.</strong> {describeStatus(status, now).detail}. Você pode montar o pedido agora e enviar quando a loja abrir.
            </p>
          </Notice>
        ) : null}

        {sections.length === 0 ? (
          <Empty>O cardápio está sendo atualizado. Volte em alguns minutos.</Empty>
        ) : (
          sections.map((section) => (
            <Section key={section.category.id} id={section.category.slug} aria-labelledby={`titulo-${section.category.slug}`}>
              <SectionHead>
                <h2 id={`titulo-${section.category.slug}`}>{section.category.name}</h2>
                {section.category.description ? <p>{section.category.description}</p> : null}
              </SectionHead>
              <Grid role="list">
                {section.products.map((product) => {
                  // Combo com escolha de bebida: o "+" abre o item para escolher antes de adicionar.
                  const asksDrink = drinkChoiceFor(product, catalog) !== null;
                  return (
                    <li key={`${section.category.id}-${product.id}`}>
                      <ProductCard
                        product={product}
                        now={now}
                        asksDrink={asksDrink}
                        onOpen={() => openProduct(product.id)}
                        onQuickAdd={() => {
                          if (asksDrink) {
                            openProduct(product.id);
                            return;
                          }
                          add({ productId: product.id, quantity: 1 });
                          if (soundOn) sfx.add();
                          haptic(8);
                        }}
                      />
                    </li>
                  );
                })}
              </Grid>
            </Section>
          ))
        )}
      </Wrap>
    </Root>
  );
}

const Root = styled.div`
  padding-bottom: 32px;
`;

const Wrap = styled.div`
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};
`;

const Notice = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: ${radius.md};
  background: ${c.paper2};
  font-size: 0.9375rem;

  svg {
    flex: none;
    width: 20px;
    height: 20px;
    margin-top: 1px;
    color: ${c.amberInk};
  }

  &[data-tone='closed'] {
    background: ${c.redSoft};
    svg {
      color: ${c.red};
    }
  }
`;

const Section = styled.section`
  padding-top: 36px;
  scroll-margin-top: calc(${layout.header} + ${layout.categoryNav} + 8px);

  ${mq.md} {
    padding-top: 56px;
  }
`;

const SectionHead = styled.div`
  display: grid;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 2px solid ${c.ink};

  h2 {
    font-family: ${font.display};
    font-size: clamp(1.625rem, 1.3rem + 1.3vw, 2.25rem);
  }

  p {
    color: ${c.muted};
    font-size: 0.9375rem;
    padding-bottom: 8px;
  }
`;

const Grid = styled.ul`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;

  ${mq.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 40px;
  }
`;

const Empty = styled.p`
  padding: 48px 0;
  color: ${c.muted};
  text-align: center;
`;
