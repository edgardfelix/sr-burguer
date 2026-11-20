'use client';

import { Banknote, Bike, CreditCard, QrCode, Store } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { ApiError, apiFetch } from '@/client/api';
import { useCart, useCustomer, useMenuUi, useTrackedOrder, type CustomerProfile } from '@/client/cart-store';
import { sfx } from '@/client/sound';
import { formatBRL, parseBRL } from '@/lib/money';
import { describeStatus } from '@/lib/schedule';
import { orderInputSchema } from '@/lib/schemas';
import { formatAddressLine, formatCityLine } from '@/lib/site';
import type { FulfillmentType, Order, PaymentMethod } from '@/lib/types';
import { formatPhone } from '@/lib/whatsapp';
import { c, font, mq, radius } from '@/styles/tokens';
import { Button } from '../ui/Button';
import { Segmented, TextAreaField, TextField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { useSound } from './SoundToggle';
import { useStore } from './StoreProvider';
import { useCartSummary } from './useCartSummary';

interface FormState {
  name: string;
  phone: string;
  fulfillment: FulfillmentType;
  street: string;
  number: string;
  district: string;
  reference: string;
  payment: PaymentMethod;
  changeFor: string;
  noChange: boolean;
  notes: string;
}

type FieldName = keyof FormState;

const FIELD_BY_PATH: Record<string, FieldName> = {
  'customer.name': 'name',
  'customer.phone': 'phone',
  'fulfillment.address.street': 'street',
  'fulfillment.address.number': 'number',
  'fulfillment.address.district': 'district',
  'fulfillment.address.reference': 'reference',
  'payment.changeFor': 'changeFor',
  changeFor: 'changeFor',
  notes: 'notes',
};

function fromProfile(profile: CustomerProfile): FormState {
  return {
    name: profile.name,
    phone: profile.phone ? formatPhone(profile.phone) : '',
    fulfillment: profile.fulfillment,
    street: profile.street,
    number: profile.number,
    district: profile.district,
    reference: profile.reference,
    payment: profile.payment,
    changeFor: '',
    noChange: false,
    notes: '',
  };
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: typeof QrCode }[] = [
  { value: 'pix', label: 'Pix', icon: QrCode },
  { value: 'card', label: 'Cartão', icon: CreditCard },
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
];

export function CheckoutPanel() {
  const { settings, status, ready, now, refreshMenu } = useStore();
  const panel = useMenuUi((s) => s.panel);
  const openPanel = useMenuUi((s) => s.openPanel);
  const trackOrder = useTrackedOrder((s) => s.track);
  const profile = useCustomer((s) => s.profile);
  const saveProfile = useCustomer((s) => s.save);
  const clearCart = useCart((s) => s.clear);
  const { items, subtotal, blocked } = useCartSummary();
  const { enabled: soundOn } = useSound();

  const [form, setForm] = useState<FormState>(() => fromProfile(profile));
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const open = panel === 'checkout';
  const [wasOpen, setWasOpen] = useState(open);

  // Ao abrir, os dados salvos neste aparelho preenchem o formulário (estado derivado, sem efeito).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm((current) => ({ ...fromProfile(profile), notes: current.notes, changeFor: current.changeFor, noChange: current.noChange }));
      setErrors({});
      setFormError(null);
    }
  }

  // Foca o primeiro campo inválido só logo após uma tentativa de envio (nunca enquanto a pessoa digita).
  const focusAfterSubmit = useRef(false);
  useEffect(() => {
    if (!focusAfterSubmit.current) return;
    focusAfterSubmit.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const deliveryAllowed = settings.acceptsDelivery;
  const pickupAllowed = settings.acceptsPickup;
  const fulfillment: FulfillmentType =
    form.fulfillment === 'delivery' && !deliveryAllowed ? 'pickup' : form.fulfillment === 'pickup' && !pickupAllowed ? 'delivery' : form.fulfillment;
  const deliveryFee = fulfillment === 'delivery' ? settings.deliveryFee : 0;
  const total = subtotal + (deliveryFee ?? 0);
  const closed = ready && !status.isOpen;

  const set = <K extends FieldName>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (closed) {
      setFormError(`A loja está fechada. ${describeStatus(status, now).detail}.`);
      return;
    }
    if (blocked.length) {
      setFormError(
        blocked.some((i) => i.issue === 'unavailable')
          ? 'Remova os itens indisponíveis do pedido para continuar.'
          : 'Escolha a bebida dos combos no carrinho para continuar.',
      );
      return;
    }

    const changeCents = form.noChange ? null : parseBRL(form.changeFor);
    const payload = {
      customer: { name: form.name, phone: form.phone },
      fulfillment:
        fulfillment === 'delivery'
          ? {
              type: 'delivery' as const,
              address: { street: form.street, number: form.number, district: form.district, ...(form.reference.trim() ? { reference: form.reference } : {}) },
            }
          : { type: 'pickup' as const },
      payment: form.payment === 'cash' ? { method: 'cash' as const, changeFor: changeCents } : { method: form.payment },
      items: items.map((i) => ({
        productId: i.line.productId,
        quantity: i.line.quantity,
        ...(i.line.note ? { note: i.line.note } : {}),
        ...(i.drink ? { drinkId: i.drink.id } : {}),
      })),
      ...(form.notes.trim() ? { notes: form.notes } : {}),
    };

    const nextErrors: Partial<Record<FieldName, string>> = {};
    const parsed = orderInputSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = FIELD_BY_PATH[issue.path.join('.')];
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
    }
    if (form.payment === 'cash' && !form.noChange) {
      if (changeCents === null) nextErrors.changeFor = 'Informe o valor para o troco ou marque "Não preciso de troco"';
      else if (changeCents < total) nextErrors.changeFor = `O troco precisa ser para um valor acima de ${formatBRL(total)}`;
    }
    if (Object.keys(nextErrors).length) {
      focusAfterSubmit.current = true;
      setErrors(nextErrors);
      if (soundOn) sfx.error();
      return;
    }

    setSubmitting(true);
    try {
      const { order } = await apiFetch<{ order: Order }>('/api/orders', { method: 'POST', json: parsed.data });
      saveProfile({
        name: form.name.trim(),
        phone: order.customer.phone,
        fulfillment,
        street: form.street.trim(),
        number: form.number.trim(),
        district: form.district.trim(),
        reference: form.reference.trim(),
        payment: form.payment,
      });
      clearCart();
      trackOrder(order);
      openPanel('success');
      if (soundOn) sfx.success();
    } catch (error) {
      if (soundOn) sfx.error();
      if (error instanceof ApiError) {
        const mapped: Partial<Record<FieldName, string>> = {};
        for (const [path, message] of Object.entries(error.fields)) {
          const field = FIELD_BY_PATH[path];
          if (field) mapped[field] = message;
        }
        focusAfterSubmit.current = Object.keys(mapped).length > 0;
        setErrors(mapped);
        setFormError(error.message);
        if (error.code === 'pricing') await refreshMenu();
      } else {
        setFormError('Não foi possível enviar. Tente de novo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => openPanel(value ? 'checkout' : 'cart')}
      title="Entrega e pagamento"
      desktop="center"
      size="lg"
      footer={
        <FooterInner>
          {formError ? (
            <FormError role="alert" aria-live="assertive">
              {formError}
            </FormError>
          ) : closed ? (
            <FormError role="status">
              Loja fechada agora. {describeStatus(status, now).detail}.
            </FormError>
          ) : null}
          <Button type="submit" form="form-checkout" data-block="true" data-size="lg" data-loading={submitting} disabled={submitting || closed || items.length === 0}>
            Enviar pedido · {formatBRL(total)}
            {deliveryFee === null ? ' + entrega' : ''}
          </Button>
        </FooterInner>
      }
    >
      <Form id="form-checkout" ref={formRef} onSubmit={submit} noValidate>
        <Group aria-labelledby="sec-dados">
          <GroupTitle id="sec-dados">Seus dados</GroupTitle>
          <TextField
            label="Nome completo"
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            value={form.name}
            error={errors.name}
            onChange={(e) => set('name', e.target.value)}
            maxLength={80}
          />
          <TextField
            label="WhatsApp"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            enterKeyHint="next"
            placeholder="(11) 98765-4321"
            value={form.phone}
            error={errors.phone}
            hint="Usado pela loja para confirmar o pedido."
            onChange={(e) => set('phone', formatPhone(e.target.value))}
          />
        </Group>

        <Group aria-labelledby="sec-recebimento">
          <GroupTitle id="sec-recebimento">Entrega ou retirada</GroupTitle>
          <Segmented<FulfillmentType>
            name="fulfillment"
            ariaLabel="Forma de recebimento"
            value={fulfillment}
            onChange={(v) => set('fulfillment', v)}
            options={[
              { value: 'delivery', label: 'Entrega', icon: <Bike aria-hidden />, disabled: !deliveryAllowed },
              { value: 'pickup', label: 'Retirar no balcão', icon: <Store aria-hidden />, disabled: !pickupAllowed },
            ]}
          />
          {fulfillment === 'delivery' ? (
            <>
              <TextField
                label="Rua"
                name="street"
                autoComplete="address-line1"
                enterKeyHint="next"
                value={form.street}
                error={errors.street}
                onChange={(e) => set('street', e.target.value)}
                maxLength={120}
              />
              <TwoCols>
                <TextField
                  label="Número"
                  name="number"
                  autoComplete="address-line2"
                  enterKeyHint="next"
                  value={form.number}
                  error={errors.number}
                  onChange={(e) => set('number', e.target.value)}
                  maxLength={12}
                />
                <TextField
                  label="Bairro"
                  name="district"
                  autoComplete="address-level3"
                  enterKeyHint="next"
                  value={form.district}
                  error={errors.district}
                  onChange={(e) => set('district', e.target.value)}
                  maxLength={80}
                />
              </TwoCols>
              <TextField
                label="Ponto de referência"
                name="reference"
                optional
                enterKeyHint="next"
                placeholder="Ex.: portão azul, perto da praça"
                value={form.reference}
                error={errors.reference}
                onChange={(e) => set('reference', e.target.value)}
                maxLength={140}
              />
              <Note>
                Entregas em {formatCityLine(settings.address)}.{' '}
                {settings.deliveryFee === null ? 'A taxa de entrega é combinada pelo WhatsApp.' : `Taxa de entrega: ${formatBRL(settings.deliveryFee)}.`}
              </Note>
            </>
          ) : (
            <Note>
              Retire em {formatAddressLine(settings.address)}, {formatCityLine(settings.address)}.
            </Note>
          )}
        </Group>

        <Group aria-labelledby="sec-pagamento">
          <GroupTitle id="sec-pagamento">Pagamento</GroupTitle>
          <Choices role="radiogroup" aria-labelledby="sec-pagamento">
            {PAYMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Choice key={value}>
                <input type="radio" name="payment" value={value} checked={form.payment === value} onChange={() => set('payment', value)} />
                <Icon aria-hidden />
                <span>{label}</span>
              </Choice>
            ))}
          </Choices>
          <Note>
            {form.payment === 'pix'
              ? settings.pixKey
                ? 'A chave Pix aparece assim que você enviar o pedido.'
                : 'A loja envia a chave Pix pelo WhatsApp.'
              : form.payment === 'card'
                ? `Maquininha de crédito e débito na ${fulfillment === 'delivery' ? 'entrega' : 'retirada'}.`
                : `Pagamento em dinheiro na ${fulfillment === 'delivery' ? 'entrega' : 'retirada'}.`}
          </Note>
          {form.payment === 'cash' ? (
            <CashRow>
              <TextField
                label="Troco para"
                name="changeFor"
                inputMode="decimal"
                placeholder={`Acima de ${formatBRL(total)}`}
                value={form.changeFor}
                disabled={form.noChange}
                error={errors.changeFor}
                onChange={(e) => set('changeFor', e.target.value.replace(/[^\d,.\sR$]/g, ''))}
              />
              <Check>
                <input type="checkbox" checked={form.noChange} onChange={(e) => set('noChange', e.target.checked)} />
                Não preciso de troco
              </Check>
            </CashRow>
          ) : null}
        </Group>

        <Group aria-labelledby="sec-obs">
          <GroupTitle id="sec-obs">Observações do pedido</GroupTitle>
          <TextAreaField
            label="Observações"
            optional
            rows={3}
            maxLength={500}
            placeholder="Ex.: interfone com defeito, me ligue ao chegar"
            value={form.notes}
            error={errors.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Group>

        <Summary aria-label="Resumo do pedido">
          {items
            .filter((i) => i.available)
            .map((i) => (
              <div key={i.line.key}>
                <span>
                  {i.line.quantity}x {i.product?.name}
                  {i.drink ? <small>Bebida: {i.drink.name}</small> : null}
                  {i.line.note ? <small>Obs.: {i.line.note}</small> : null}
                </span>
                <span>{formatBRL(i.total)}</span>
              </div>
            ))}
          <div data-row="sub" data-first="true">
            <span>Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          {fulfillment === 'delivery' ? (
            <div data-row="sub">
              <span>Entrega</span>
              <span>{deliveryFee === null ? 'A combinar' : formatBRL(deliveryFee)}</span>
            </div>
          ) : null}
          <div data-row="total">
            <span>Total</span>
            <span>{formatBRL(total)}</span>
          </div>
        </Summary>
      </Form>
    </Sheet>
  );
}

const Form = styled.form`
  display: grid;
  gap: 28px;
`;

const Group = styled.section`
  display: grid;
  gap: 14px;
`;

const GroupTitle = styled.h3`
  font-family: ${font.display};
  font-size: 1.1875rem;
  font-weight: 600;
  letter-spacing: -0.01em;
`;

const TwoCols = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 12px;
`;

const Note = styled.p`
  font-size: 0.9375rem;
  color: ${c.muted};
`;

const Choices = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`;

const Choice = styled.label`
  position: relative;
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 14px 8px;
  border: 1px solid ${c.lineStrong};
  border-radius: ${radius.md};
  background: ${c.surface};
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
  user-select: none;

  svg {
    width: 22px;
    height: 22px;
    color: ${c.muted};
    transition: color 160ms ease;
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &:has(input:checked) {
    border-color: ${c.ink};
    background: ${c.paper};
    box-shadow: inset 0 0 0 1px ${c.ink};
  }
  &:has(input:checked) svg {
    color: ${c.ink};
  }
  &:has(input:focus-visible) {
    outline: 2px solid ${c.focus};
    outline-offset: 2px;
  }
`;

const CashRow = styled.div`
  display: grid;
  gap: 10px;

  ${mq.sm} {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }
`;

const Check = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  font-weight: 500;
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
    accent-color: ${c.ink};
  }
`;

const Summary = styled.div`
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: ${radius.md};
  background: ${c.paper2};
  font-size: 0.9375rem;

  div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-variant-numeric: tabular-nums;
  }

  div span:first-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  small {
    display: block;
    margin-top: 1px;
    font-size: 0.8125rem;
    color: ${c.muted};
  }

  div[data-row='sub'] {
    color: ${c.muted};
  }

  div[data-first='true'] {
    margin-top: 6px;
    padding-top: 10px;
    border-top: 1px solid ${c.line};
  }

  div[data-row='total'] {
    margin-top: 4px;
    font-size: 1.0625rem;
    font-weight: 700;
  }
`;

const FooterInner = styled.div`
  display: grid;
  gap: 10px;
`;

const FormError = styled.p`
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${c.red};
`;
