'use client';

import { Banknote, Bike, CreditCard, CupSoda, MapPin, MessageCircle, Printer, QrCode, Store, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { formatBRL } from '@/lib/money';
import { formatOrderNumber, NEXT_STATUS, PAYMENT_LABELS, statusLabel } from '@/lib/order';
import { formatClock } from '@/lib/schedule';
import type { Order, OrderStatus } from '@/lib/types';
import { formatPhone, whatsappLink } from '@/lib/whatsapp';
import { c, ease, font, mq, radius } from '@/styles/tokens';
import { Button, IconButton } from '../ui/Button';

const PREVIOUS_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  preparando: 'novo',
  despachado: 'preparando',
  concluido: 'despachado',
  cancelado: 'novo',
};

function primaryLabel(order: Order): string | null {
  switch (order.status) {
    case 'novo':
      return 'Aceitar e preparar';
    case 'preparando':
      return order.fulfillment.type === 'delivery' ? 'Saiu para entrega' : 'Pronto para retirada';
    case 'despachado':
      return 'Concluir pedido';
    default:
      return null;
  }
}

function elapsed(from: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - from) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `há ${h} h ${minutes % 60} min`;
}

const PAY_ICON = { pix: QrCode, card: CreditCard, cash: Banknote } as const;

interface OrderCardProps {
  order: Order;
  now: number;
  onStatus: (status: OrderStatus) => void;
  onPrint: () => void;
}

export function OrderCard({ order, now, onStatus, onPrint }: OrderCardProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = NEXT_STATUS[order.status];
  const previous = PREVIOUS_STATUS[order.status];
  const PayIcon = PAY_ICON[order.payment.method];
  const change = order.payment.method === 'cash' && order.payment.changeFor ? order.payment.changeFor - order.total : null;
  const firstName = order.customer.name.split(' ')[0] ?? '';

  useEffect(() => {
    if (!confirmCancel) return;
    const id = window.setTimeout(() => setConfirmCancel(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirmCancel]);

  return (
    <Card data-status={order.status} aria-label={`Pedido ${formatOrderNumber(order.number)} de ${order.customer.name}`}>
      <Head>
        <div>
          <Number>{formatOrderNumber(order.number)}</Number>
          <Time>
            {formatClock(order.createdAt)} · {now ? elapsed(order.createdAt, now) : ''}
          </Time>
        </div>
        <Kind data-kind={order.fulfillment.type}>
          {order.fulfillment.type === 'delivery' ? <Bike aria-hidden /> : <Store aria-hidden />}
          {order.fulfillment.type === 'delivery' ? 'Entrega' : 'Retirada'}
        </Kind>
      </Head>

      <Customer>
        <strong>{order.customer.name}</strong>
        <a href={`tel:+55${order.customer.phone}`}>{formatPhone(order.customer.phone)}</a>
      </Customer>

      {order.fulfillment.type === 'delivery' && order.fulfillment.address ? (
        <Address>
          <MapPin aria-hidden />
          <div>
            <p>
              {order.fulfillment.address.street}, {order.fulfillment.address.number}
            </p>
            <p>{order.fulfillment.address.district}</p>
            {order.fulfillment.address.reference ? <p data-ref>Ref.: {order.fulfillment.address.reference}</p> : null}
          </div>
        </Address>
      ) : null}

      <Items role="list">
        {order.items.map((item, index) => (
          <li key={`${item.productId}-${index}`}>
            <span data-qty>{item.quantity}x</span>
            <span data-name>
              {item.name}
              {item.drink ? (
                <b data-drink>
                  <CupSoda aria-hidden /> {item.drink.name}
                </b>
              ) : null}
              {item.note ? <em>{item.note}</em> : null}
            </span>
            <span data-total>{formatBRL(item.total)}</span>
          </li>
        ))}
      </Items>

      {order.notes ? <Notes>Obs. do pedido: {order.notes}</Notes> : null}

      <Totals>
        {order.fulfillment.type === 'delivery' ? (
          <div>
            <span>Entrega</span>
            <span>{order.deliveryFee === null ? 'a combinar' : formatBRL(order.deliveryFee)}</span>
          </div>
        ) : null}
        <div data-total>
          <span>Total</span>
          <span>{formatBRL(order.total)}</span>
        </div>
      </Totals>

      <Payment data-cash={order.payment.method === 'cash'}>
        <PayIcon aria-hidden />
        <div>
          <strong>{PAYMENT_LABELS[order.payment.method]}</strong>
          {order.payment.method === 'cash' ? (
            order.payment.changeFor ? (
              <span>
                Troco para {formatBRL(order.payment.changeFor)}: levar <b>{formatBRL(change ?? 0)}</b>
                {order.fulfillment.type === 'delivery' && order.deliveryFee === null ? ' + diferença da taxa' : ''}
              </span>
            ) : (
              <span>Sem troco</span>
            )
          ) : null}
        </div>
      </Payment>

      <Actions>
        {next ? (
          <Button type="button" data-size="sm" data-block="true" onClick={() => onStatus(next)}>
            {primaryLabel(order)}
          </Button>
        ) : (
          <StatusNote data-status={order.status}>{statusLabel(order.status, order.fulfillment.type)}</StatusNote>
        )}
        <Row>
          <IconButton type="button" data-size="sm" data-variant="outline" aria-label="Imprimir comanda" title="Imprimir comanda" onClick={onPrint}>
            <Printer aria-hidden />
          </IconButton>
          <IconButton
            as="a"
            href={whatsappLink(order.customer.phone, `Olá, ${firstName}! Aqui é da SR Burguer, sobre o seu pedido ${formatOrderNumber(order.number)}.`)}
            target="_blank"
            rel="noopener noreferrer"
            data-size="sm"
            data-variant="outline"
            aria-label={`Conversar com ${order.customer.name} no WhatsApp`}
            title="WhatsApp do cliente"
          >
            <MessageCircle aria-hidden />
          </IconButton>
          {previous ? (
            <IconButton type="button" data-size="sm" data-variant="outline" aria-label={`Voltar para ${statusLabel(previous, order.fulfillment.type)}`} title="Voltar uma etapa" onClick={() => onStatus(previous)}>
              <Undo2 aria-hidden />
            </IconButton>
          ) : null}
          {order.status !== 'cancelado' && order.status !== 'concluido' ? (
            <Cancel type="button" data-confirm={confirmCancel} onClick={() => (confirmCancel ? onStatus('cancelado') : setConfirmCancel(true))}>
              {confirmCancel ? 'Confirmar cancelamento' : 'Cancelar'}
            </Cancel>
          ) : null}
        </Row>
      </Actions>
    </Card>
  );
}

const Card = styled.article`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${c.line};
  border-radius: ${radius.lg};
  background: ${c.surface};
  box-shadow: 0 1px 2px rgba(28, 22, 17, 0.05);

  &[data-status='novo'] {
    border-color: ${c.amber};
    box-shadow:
      0 0 0 1px ${c.amber},
      0 8px 24px -14px rgba(150, 80, 15, 0.55);
    animation: bb-card-in 420ms ${ease.out} both;
  }

  &[data-status='cancelado'] {
    opacity: 0.6;
  }

  @keyframes bb-card-in {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
`;

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`;

const Number = styled.p`
  font-family: ${font.display};
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`;

const Time = styled.p`
  margin-top: 4px;
  font-size: 0.8125rem;
  color: ${c.muted};
  font-variant-numeric: tabular-nums;
`;

const Kind = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  border-radius: 5px;
  background: ${c.paper2};
  font-size: 0.8125rem;
  font-weight: 700;

  svg {
    width: 15px;
    height: 15px;
  }

  &[data-kind='delivery'] {
    background: ${c.ink};
    color: ${c.paper};
  }
`;

const Customer = styled.div`
  display: grid;
  gap: 2px;

  strong {
    font-size: 1rem;
  }

  a {
    font-size: 0.875rem;
    color: ${c.inkSoft};
    text-decoration: none;
    font-variant-numeric: tabular-nums;
  }
`;

const Address = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px;
  border-radius: ${radius.md};
  background: ${c.paper};
  font-size: 0.9375rem;
  line-height: 1.35;

  svg {
    flex: none;
    width: 16px;
    height: 16px;
    margin-top: 2px;
    color: ${c.amberInk};
  }

  p[data-ref] {
    color: ${c.muted};
    font-size: 0.875rem;
  }
`;

const Items = styled.ul`
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 10px 0;
  border-top: 1px dashed ${c.lineStrong};
  border-bottom: 1px dashed ${c.lineStrong};
  list-style: none;
  font-size: 0.9375rem;

  li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    align-items: baseline;
  }

  span[data-qty] {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  span[data-name] {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  em {
    display: block;
    margin-top: 2px;
    padding: 2px 6px;
    border-radius: 4px;
    background: ${c.amberSoft};
    color: ${c.ink};
    font-style: normal;
    font-weight: 600;
    font-size: 0.8125rem;
    width: fit-content;
  }

  /* Bebida do combo: destacada para a cozinha separar a lata certa. */
  b[data-drink] {
    display: flex;
    align-items: center;
    gap: 5px;
    width: fit-content;
    margin-top: 3px;
    padding: 2px 7px 2px 5px;
    border: 1px solid ${c.lineStrong};
    border-radius: 4px;
    background: ${c.surface};
    font-size: 0.8125rem;
    font-weight: 700;

    svg {
      flex: none;
      width: 14px;
      height: 14px;
      color: ${c.amberInk};
    }
  }

  span[data-total] {
    color: ${c.muted};
    font-variant-numeric: tabular-nums;
    font-size: 0.875rem;
  }
`;

const Notes = styled.p`
  padding: 8px 10px;
  border-radius: ${radius.md};
  background: ${c.amberSoft};
  font-size: 0.875rem;
  font-weight: 600;
`;

const Totals = styled.div`
  display: grid;
  gap: 4px;
  font-size: 0.9375rem;

  div {
    display: flex;
    justify-content: space-between;
    color: ${c.muted};
    font-variant-numeric: tabular-nums;
  }

  div[data-total] {
    color: ${c.ink};
    font-weight: 800;
    font-size: 1.0625rem;
  }
`;

const Payment = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px;
  border-radius: ${radius.md};
  background: ${c.paper};
  font-size: 0.9375rem;

  svg {
    flex: none;
    width: 18px;
    height: 18px;
    margin-top: 1px;
  }

  div {
    display: grid;
    gap: 2px;
  }

  &[data-cash='true'] {
    background: ${c.greenSoft};
    color: ${c.ink};
  }

  b {
    font-weight: 800;
  }
`;

const Actions = styled.div`
  display: grid;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatusNote = styled.p`
  padding: 8px 10px;
  border-radius: ${radius.md};
  background: ${c.greenSoft};
  color: ${c.green};
  font-weight: 700;
  font-size: 0.9375rem;
  text-align: center;

  &[data-status='cancelado'] {
    background: ${c.redSoft};
    color: ${c.red};
  }
`;

const Cancel = styled.button`
  margin-left: auto;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: ${radius.sm};
  background: none;
  color: ${c.red};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease;

  &[data-confirm='true'] {
    background: ${c.red};
    color: #fff8ee;
  }

  ${mq.hover} {
    &:hover:not([data-confirm='true']) {
      background: ${c.redSoft};
    }
  }
`;
