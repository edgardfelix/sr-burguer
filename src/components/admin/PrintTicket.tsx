'use client';

import { createPortal } from 'react-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { formatBRL } from '@/lib/money';
import { FULFILLMENT_LABELS, formatOrderNumber, PAYMENT_LABELS } from '@/lib/order';
import { formatClock } from '@/lib/schedule';
import type { Order, StoreSettings } from '@/lib/types';
import { formatPhone } from '@/lib/whatsapp';

/** Na impressão, só a comanda aparece (largura de impressora térmica de 80 mm). */
const PrintOnly = createGlobalStyle`
  @media print {
    @page { size: 80mm auto; margin: 4mm; }
    body > *:not(.bb-print-root) { display: none !important; }
    .bb-print-root { display: block !important; }
  }
`;

export function PrintTicket({ order, settings }: { order: Order; settings: StoreSettings }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <Root className="bb-print-root" aria-hidden="true">
      <PrintOnly />
      <h2>{settings.name}</h2>
      <p>
        Pedido {formatOrderNumber(order.number)} · {formatClock(order.createdAt)} · {order.businessDate.split('-').reverse().join('/')}
      </p>
      <hr />
      <p>
        <b>{FULFILLMENT_LABELS[order.fulfillment.type].toUpperCase()}</b>
      </p>
      <p>{order.customer.name}</p>
      <p>{formatPhone(order.customer.phone)}</p>
      {order.fulfillment.address ? (
        <>
          <p>
            {order.fulfillment.address.street}, {order.fulfillment.address.number}
          </p>
          <p>{order.fulfillment.address.district}</p>
          {order.fulfillment.address.reference ? <p>Ref.: {order.fulfillment.address.reference}</p> : null}
        </>
      ) : null}
      <hr />
      {order.items.map((item, i) => (
        <div key={i} className="item">
          <p>
            <b>{item.quantity}x</b> {item.name}
            <span>{formatBRL(item.total)}</span>
          </p>
          {item.drink ? <p className="note">Bebida: {item.drink.name}</p> : null}
          {item.note ? <p className="note">&gt; {item.note}</p> : null}
        </div>
      ))}
      {order.notes ? (
        <>
          <hr />
          <p className="note">Obs.: {order.notes}</p>
        </>
      ) : null}
      <hr />
      <p>
        Subtotal <span>{formatBRL(order.subtotal)}</span>
      </p>
      {order.fulfillment.type === 'delivery' ? (
        <p>
          Entrega <span>{order.deliveryFee === null ? 'a combinar' : formatBRL(order.deliveryFee)}</span>
        </p>
      ) : null}
      <p className="total">
        TOTAL <span>{formatBRL(order.total)}</span>
      </p>
      <p>
        Pagamento: {PAYMENT_LABELS[order.payment.method]}
        {order.payment.method === 'cash' && order.payment.changeFor
          ? ` (troco para ${formatBRL(order.payment.changeFor)}: ${formatBRL(order.payment.changeFor - order.total)})`
          : ''}
      </p>
    </Root>,
    document.body,
  );
}

const Root = styled.div`
  display: none;
  width: 72mm;
  color: #000;
  font-family: 'Courier New', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.35;

  h2 {
    font-family: inherit;
    font-size: 16px;
    text-align: center;
    letter-spacing: 0;
  }

  p {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  p span {
    white-space: nowrap;
  }

  hr {
    border: 0;
    border-top: 1px dashed #000;
    margin: 6px 0;
  }

  .note {
    font-weight: 700;
  }

  .total {
    font-size: 14px;
    font-weight: 700;
  }
`;
