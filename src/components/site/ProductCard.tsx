'use client';

import { Check, Plus } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { effectivePrice, isPromoActive } from '@/lib/catalog';
import { formatBRL } from '@/lib/money';
import type { Product } from '@/lib/types';
import { c, ease, mq, radius } from '@/styles/tokens';

interface ProductCardProps {
  product: Product;
  now: number;
  onOpen: () => void;
  onQuickAdd: () => void;
  /** O "+" abre o item para escolher a bebida antes de adicionar. */
  asksDrink?: boolean;
}

export function ProductCard({ product, now, onOpen, onQuickAdd, asksDrink }: ProductCardProps) {
  const promo = isPromoActive(product, now);
  const price = effectivePrice(product, now);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(false), 900);
    return () => window.clearTimeout(id);
  }, [added]);

  return (
    <Card data-has-image={Boolean(product.image)}>
      <Info>
        <Name>
          <button type="button" onClick={onOpen}>
            {product.name}
          </button>
        </Name>
        {product.description ? <Desc>{product.description}</Desc> : null}
        <PriceRow>
          {promo ? <Tag data-tone="promo">Promoção</Tag> : product.featured ? <Tag>Destaque</Tag> : null}
          <Price data-promo={promo}>{formatBRL(price)}</Price>
          {promo ? (
            <Old>
              <span className="visually-hidden">de </span>
              {formatBRL(product.price)}
            </Old>
          ) : null}
        </PriceRow>
      </Info>
      <Side>
        {product.image ? (
          <Thumb data-contain={product.imageContain || undefined}>
            <Image
              src={product.image}
              alt={product.imageAlt || product.name}
              fill
              sizes="(min-width: 768px) 136px, 120px"
              quality={82}
              unoptimized={product.image.startsWith('/api/media/')}
            />
          </Thumb>
        ) : null}
        <Add
          type="button"
          aria-label={asksDrink ? `Escolher a bebida e adicionar ${product.name}` : `Adicionar ${product.name} ao pedido`}
          aria-haspopup={asksDrink ? 'dialog' : undefined}
          data-added={added}
          onClick={() => {
            if (!asksDrink) setAdded(true);
            onQuickAdd();
          }}
        >
          <span data-icon="plus">
            <Plus aria-hidden />
          </span>
          <span data-icon="check">
            <Check aria-hidden />
          </span>
        </Add>
      </Side>
    </Card>
  );
}

const Card = styled.article`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid ${c.line};
  height: 100%;

  ${mq.hover} {
    &:hover img {
      transform: scale(1.03);
    }
  }
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Name = styled.h3`
  font-size: 1.0625rem;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.01em;

  button {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    user-select: text;
  }

  /* O nome cobre o card inteiro (alvo grande) sem aninhar botões. */
  button::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: ${radius.md};
  }

  button:focus-visible {
    outline: none;
  }
  button:focus-visible::after {
    outline: 2px solid ${c.focus};
    outline-offset: 2px;
  }
`;

const Desc = styled.p`
  font-size: 0.9375rem;
  line-height: 1.45;
  color: ${c.muted};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PriceRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
`;

const Price = styled.span`
  font-size: 1.0625rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${c.ink};

  &[data-promo='true'] {
    color: ${c.red};
  }
`;

const Old = styled.s`
  font-size: 0.9375rem;
  color: ${c.muted};
  font-variant-numeric: tabular-nums;
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 7px;
  border-radius: ${radius.xs};
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  background: ${c.amberSoft};
  color: ${c.amberInk};

  &[data-tone='promo'] {
    background: ${c.red};
    color: #fff8ee;
  }
`;

const Side = styled.div`
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  align-self: stretch;
`;

const Thumb = styled.div`
  position: relative;
  overflow: hidden;
  width: 120px;
  aspect-ratio: 4 / 3;
  border-radius: ${radius.md};
  background: ${c.paper2};
  align-self: flex-start;

  img {
    object-fit: cover;
    transition: transform 420ms ${ease.out};
  }

  &[data-contain] img {
    object-fit: contain;
    padding: 6px;
  }

  ${mq.md} {
    width: 136px;
  }
`;

const Add = styled.button`
  position: absolute;
  right: -6px;
  bottom: -6px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 3px solid ${c.paper};
  border-radius: ${radius.md};
  background: ${c.amber};
  color: ${c.ink};
  cursor: pointer;
  transition:
    transform 160ms ${ease.out},
    background-color 180ms ease;

  [data-has-image='false'] & {
    position: relative;
    right: 0;
    bottom: 0;
    border-color: transparent;
  }

  span {
    grid-area: 1 / 1;
    display: grid;
    place-items: center;
    transition:
      opacity 180ms ease,
      transform 220ms ${ease.out};
  }

  span[data-icon='check'] {
    opacity: 0;
    transform: scale(0.6);
  }

  &[data-added='true'] {
    background: ${c.ink};
    color: ${c.paper};
  }
  &[data-added='true'] span[data-icon='plus'] {
    opacity: 0;
    transform: scale(0.6) rotate(90deg);
  }
  &[data-added='true'] span[data-icon='check'] {
    opacity: 1;
    transform: scale(1);
  }

  svg {
    width: 20px;
    height: 20px;
  }

  &:active {
    transform: scale(0.92);
  }

  ${mq.hover} {
    &:hover:not([data-added='true']) {
      background: #d8861f;
    }
  }
`;
