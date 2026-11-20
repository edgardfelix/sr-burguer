'use client';

import { Check, CupSoda } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import styled from 'styled-components';
import { useCart, useMenuUi } from '@/client/cart-store';
import { haptic, sfx } from '@/client/sound';
import { drinkChoiceFor, effectivePrice, isPromoActive } from '@/lib/catalog';
import { formatBRL } from '@/lib/money';
import { formatClock } from '@/lib/schedule';
import { c, ease, mq, radius } from '@/styles/tokens';
import { Button } from '../ui/Button';
import { TextAreaField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { Stepper } from '../ui/Stepper';
import { useSound } from './SoundToggle';
import { useStore } from './StoreProvider';

/** Valor do rádio "Sem preferência" na escolha opcional. */
const NO_PREFERENCE = '';

export function ProductSheet() {
  const { catalog, now } = useStore();
  const productId = useMenuUi((s) => s.productId);
  const editing = useMenuUi((s) => s.editing);
  const openProduct = useMenuUi((s) => s.openProduct);
  const add = useCart((s) => s.add);
  const replace = useCart((s) => s.replace);
  const { enabled: soundOn } = useSound();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [drinkId, setDrinkId] = useState<string | null>(null);
  const [drinkError, setDrinkError] = useState(false);
  const drinkGroupRef = useRef<HTMLFieldSetElement>(null);

  // Último item aberto: continua na tela durante a animação de saída.
  const openKey = productId ? `${productId}|${editing?.key ?? ''}` : null;
  const [shown, setShown] = useState<{ id: string; editingKey: string | null } | null>(null);
  const [previousKey, setPreviousKey] = useState<string | null>(null);

  // Estado derivado (padrão recomendado pelo React): cada abertura recomeça do zero ou dos dados da linha editada.
  if (openKey !== previousKey) {
    setPreviousKey(openKey);
    if (productId) {
      setShown({ id: productId, editingKey: editing?.key ?? null });
      setQuantity(editing?.quantity ?? 1);
      setNote(editing?.note ?? '');
      setDrinkId(editing ? (editing.drinkId ?? NO_PREFERENCE) : null);
      setDrinkError(false);
    }
  }

  const product = productId ? (catalog.products[productId] ?? null) : null;
  const item = shown ? (catalog.products[shown.id] ?? null) : null;

  if (!item || !shown) return null;
  const promo = isPromoActive(item, now);
  const unit = effectivePrice(item, now);
  const choice = drinkChoiceFor(item, catalog);
  const isEditing = shown.editingKey !== null;
  // Bebida salva que saiu das opções (acabou) não conta como escolhida.
  const selectedDrink = choice && drinkId ? (choice.options.find((o) => o.id === drinkId) ?? null) : null;
  const drinkValue = selectedDrink ? selectedDrink.id : drinkId === NO_PREFERENCE && choice?.mode === 'optional' ? NO_PREFERENCE : null;

  const confirm = () => {
    if (choice?.mode === 'required' && !selectedDrink) {
      setDrinkError(true);
      if (soundOn) sfx.error();
      haptic([12, 40, 12]);
      const group = drinkGroupRef.current;
      group?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      group?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus({ preventScroll: true });
      return;
    }
    const draft = { productId: item.id, quantity, note, ...(selectedDrink ? { drinkId: selectedDrink.id } : {}) };
    if (isEditing && shown.editingKey) replace(shown.editingKey, draft);
    else add(draft);
    if (soundOn) sfx.add();
    haptic(10);
    openProduct(null);
  };

  const pickDrink = (value: string) => {
    setDrinkId(value);
    setDrinkError(false);
    if (soundOn) sfx.tick();
  };

  return (
    <Sheet
      open={Boolean(product)}
      onOpenChange={(open) => !open && openProduct(null)}
      title={item.name}
      desktop="center"
      footer={
        <Button type="button" data-block="true" data-size="lg" onClick={confirm} disabled={!item.available}>
          {isEditing ? 'Salvar alterações' : 'Adicionar ao pedido'} · {formatBRL(unit * quantity)}
        </Button>
      }
    >
      <Content>
        {item.image ? (
          <Photo data-contain={item.imageContain || undefined}>
            <Image
              src={item.image}
              alt={item.imageAlt || item.name}
              fill
              sizes="260px"
              quality={82}
              unoptimized={item.image.startsWith('/api/media/')}
            />
          </Photo>
        ) : null}
        {item.description ? <Description>{item.description}</Description> : null}
        <Prices>
          <strong data-promo={promo}>{formatBRL(unit)}</strong>
          {promo ? <s>{formatBRL(item.price)}</s> : null}
          {promo && item.promoEndsAt ? <span>Promoção até {formatClock(item.promoEndsAt)}</span> : null}
        </Prices>

        {choice ? (
          <DrinkGroup
            ref={drinkGroupRef}
            aria-invalid={drinkError || undefined}
            aria-describedby={drinkError ? 'erro-bebida' : 'ajuda-bebida'}
            data-error={drinkError || undefined}
          >
            <legend>
              <CupSoda aria-hidden />
              Escolha a bebida
              <Tag data-required={choice.mode === 'required'}>{choice.mode === 'required' ? 'Obrigatório' : 'Opcional'}</Tag>
            </legend>
            {drinkError ? (
              <p id="erro-bebida" role="alert" data-tone="error">
                Escolha a bebida do combo para continuar.
              </p>
            ) : (
              <p id="ajuda-bebida">Já incluída no preço. Escolha 1 opção.</p>
            )}
            <Options role="radiogroup" aria-label="Bebida do combo" aria-required={choice.mode === 'required'}>
              {choice.mode === 'optional' ? (
                <Option>
                  <input type="radio" name="bebida" value={NO_PREFERENCE} checked={drinkValue === NO_PREFERENCE} onChange={() => pickDrink(NO_PREFERENCE)} />
                  <Thumb aria-hidden>
                    <CupSoda />
                  </Thumb>
                  <span>Sem preferência</span>
                  <Mark aria-hidden>
                    <Check />
                  </Mark>
                </Option>
              ) : null}
              {choice.options.map((drink) => (
                <Option key={drink.id}>
                  <input type="radio" name="bebida" value={drink.id} checked={drinkValue === drink.id} onChange={() => pickDrink(drink.id)} />
                  <Thumb aria-hidden>
                    {drink.image ? (
                      <Image src={drink.image} alt="" fill sizes="40px" unoptimized={drink.image.startsWith('/api/media/')} />
                    ) : (
                      <CupSoda />
                    )}
                  </Thumb>
                  <span>{drink.name}</span>
                  <Mark aria-hidden>
                    <Check />
                  </Mark>
                </Option>
              ))}
            </Options>
          </DrinkGroup>
        ) : null}

        <QtyRow>
          <span id="rotulo-quantidade">Quantidade</span>
          <Stepper value={quantity} onChange={(v) => setQuantity(Math.max(1, v))} label="Quantidade" />
        </QtyRow>
        <TextAreaField
          label="Observação"
          optional
          rows={3}
          maxLength={140}
          placeholder="Ex.: sem cebola, molho à parte"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          hint={`${note.length}/140`}
        />
      </Content>
    </Sheet>
  );
}

const Content = styled.div`
  display: grid;
  gap: 18px;
`;

const Photo = styled.div`
  position: relative;
  overflow: hidden;
  width: min(100%, 260px);
  aspect-ratio: 4 / 3;
  margin: 0 auto;
  border-radius: ${radius.md};
  background: ${c.paper2};

  img {
    object-fit: cover;
  }

  &[data-contain] img {
    object-fit: contain;
    padding: 10px;
  }

  ${mq.md} {
    width: 260px;
  }
`;

const Description = styled.p`
  color: ${c.inkSoft};
  font-size: 1rem;
`;

const Prices = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;

  strong {
    font-size: 1.375rem;
    font-variant-numeric: tabular-nums;
  }
  strong[data-promo='true'] {
    color: ${c.red};
  }
  s {
    color: ${c.muted};
    font-variant-numeric: tabular-nums;
  }
  span {
    font-size: 0.875rem;
    font-weight: 600;
    color: ${c.red};
  }
`;

const DrinkGroup = styled.fieldset`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 14px;
  border: 1px solid ${c.line};
  border-radius: ${radius.md};
  background: ${c.paper};
  transition: border-color 160ms ease;

  &[data-error] {
    border-color: ${c.red};
  }

  legend {
    display: flex;
    align-items: center;
    gap: 8px;
    float: left;
    width: 100%;
    padding: 0;
    font-weight: 700;
    font-size: 1rem;

    svg {
      width: 18px;
      height: 18px;
      color: ${c.amberInk};
    }
  }

  > p {
    clear: both;
    font-size: 0.875rem;
    color: ${c.muted};
  }
  > p[data-tone='error'] {
    color: ${c.red};
    font-weight: 600;
  }
`;

const Tag = styled.span`
  margin-left: auto;
  padding: 2px 8px;
  border-radius: ${radius.xs};
  background: ${c.paper2};
  color: ${c.inkSoft};
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;

  &[data-required='true'] {
    background: ${c.ink};
    color: ${c.paper};
  }
`;

const Options = styled.div`
  display: grid;
  gap: 6px;
`;

const Mark = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border: 1.5px solid ${c.lineStrong};
  border-radius: 50%;
  color: transparent;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ${ease.out};

  svg {
    width: 14px;
    height: 14px;
    stroke-width: 3;
  }
`;

const Thumb = styled.span`
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: ${radius.sm};
  background: ${c.surface};
  overflow: hidden;

  img {
    object-fit: contain;
    padding: 3px;
  }

  > svg {
    width: 20px;
    height: 20px;
    color: ${c.muted};
  }
`;

const Option = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 6px 12px 6px 6px;
  border: 1px solid ${c.line};
  border-radius: ${radius.md};
  background: ${c.surface};
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.25;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  > span:nth-of-type(2) {
    flex: 1;
    min-width: 0;
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &:active {
    transform: scale(0.99);
  }

  &:has(input:checked) {
    border-color: ${c.ink};
    box-shadow: inset 0 0 0 1px ${c.ink};
  }
  &:has(input:checked) ${Mark} {
    border-color: ${c.ink};
    background: ${c.ink};
    color: ${c.paper};
  }
  &:has(input:focus-visible) {
    outline: 2px solid ${c.focus};
    outline-offset: 2px;
  }

  ${mq.hover} {
    &:hover {
      border-color: ${c.lineStrong};
    }
  }
`;

const QtyRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid ${c.line};
  border-bottom: 1px solid ${c.line};
  font-weight: 600;
`;
