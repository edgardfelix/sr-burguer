'use client';

import { Bike, ChefHat, CircleCheckBig, Inbox } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNow } from '@/client/hooks';
import { formatBRL } from '@/lib/money';
import { shiftDate } from '@/lib/schedule';
import type { Order, OrderStatus } from '@/lib/types';
import { c, font, mq, radius } from '@/styles/tokens';
import { useAdmin } from './AdminData';
import { OrderCard } from './OrderCard';
import { PrintTicket } from './PrintTicket';

const COLUMNS: { key: OrderStatus[]; title: string; icon: typeof Inbox; empty: string }[] = [
  { key: ['novo'], title: 'Novos', icon: Inbox, empty: 'Nenhum pedido aguardando. A campainha toca quando chegar um.' },
  { key: ['preparando'], title: 'Em preparo', icon: ChefHat, empty: 'Nada na chapa agora.' },
  { key: ['despachado'], title: 'Saiu ou pronto', icon: Bike, empty: 'Nenhum pedido em rota ou no balcão.' },
  { key: ['concluido', 'cancelado'], title: 'Concluídos', icon: CircleCheckBig, empty: 'Os pedidos finalizados do dia aparecem aqui.' },
];

export function OrdersBoard() {
  const { orders, reports, settings, businessDate, updateOrderStatus } = useAdmin();
  const now = useNow(0);
  const [printing, setPrinting] = useState<Order | null>(null);

  const stats = useMemo(() => {
    const valid = orders.filter((o) => o.status !== 'cancelado');
    const revenue = valid.reduce((sum, o) => sum + o.total, 0);
    const inProgress = orders.filter((o) => o.status === 'novo' || o.status === 'preparando' || o.status === 'despachado').length;
    return { count: valid.length, revenue, inProgress, average: valid.length ? Math.round(revenue / valid.length) : 0 };
  }, [orders]);

  const yesterday = businessDate ? reports.find((r) => r.businessDate === shiftDate(businessDate, -1)) : undefined;

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener('afterprint', done);
    const id = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  return (
    <Wrap>
      <Stats>
        <Stat>
          <span>Pedidos hoje</span>
          <strong>{stats.count}</strong>
          {yesterday ? <small>Ontem: {yesterday.orders}</small> : null}
        </Stat>
        <Stat>
          <span>Faturamento hoje</span>
          <strong>{formatBRL(stats.revenue)}</strong>
          {yesterday ? <small>Ontem: {formatBRL(yesterday.revenue)}</small> : null}
        </Stat>
        <Stat>
          <span>Em andamento</span>
          <strong>{stats.inProgress}</strong>
          <small>Novos, em preparo e em rota</small>
        </Stat>
        <Stat>
          <span>Ticket médio</span>
          <strong>{formatBRL(stats.average)}</strong>
          <small>Sem pedidos cancelados</small>
        </Stat>
      </Stats>

      <Board>
        {COLUMNS.map(({ key, title, icon: Icon, empty }) => {
          const list = orders
            .filter((o) => key.includes(o.status))
            .sort((a, b) => (key[0] === 'concluido' ? b.updatedAt - a.updatedAt : a.createdAt - b.createdAt));
          return (
            <Column key={title} aria-labelledby={`col-${key[0]}`} data-col={key[0]}>
              <ColumnHead>
                <Icon aria-hidden />
                <h2 id={`col-${key[0]}`}>{title}</h2>
                <span>{list.length}</span>
              </ColumnHead>
              <List>
                {list.length === 0 ? (
                  <Empty>{empty}</Empty>
                ) : (
                  list.map((order) => (
                    <OrderCard key={order.id} order={order} now={now} onStatus={(status) => void updateOrderStatus(order.id, status)} onPrint={() => setPrinting(order)} />
                  ))
                )}
              </List>
            </Column>
          );
        })}
      </Board>
      {printing ? <PrintTicket order={printing} settings={settings} /> : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: 20px;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  ${mq.lg} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Stat = styled.div`
  display: grid;
  gap: 4px;
  padding: 16px;
  border: 1px solid ${c.line};
  border-radius: ${radius.lg};
  background: ${c.surface};

  span {
    font-size: 0.875rem;
    font-weight: 600;
    color: ${c.muted};
  }

  strong {
    font-family: ${font.display};
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  small {
    font-size: 0.8125rem;
    color: ${c.muted};
  }
`;

const Board = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(280px, 1fr);
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 8px;
  align-items: start;
`;

const Column = styled.section`
  display: grid;
  gap: 10px;
  align-content: start;
  min-height: 60vh;
  padding: 10px;
  border-radius: ${radius.lg};
  background: ${c.paper2};

  &[data-col='novo'] {
    background: #f3e3c6;
  }
`;

const ColumnHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 2px;

  svg {
    width: 18px;
    height: 18px;
    color: ${c.amberInk};
  }

  h2 {
    font-family: inherit;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0;
  }

  span {
    margin-left: auto;
    min-width: 26px;
    padding: 2px 8px;
    border-radius: 5px;
    background: ${c.surface};
    font-size: 0.8125rem;
    font-weight: 700;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
`;

const List = styled.div`
  display: grid;
  gap: 10px;
`;

const Empty = styled.p`
  padding: 20px 12px;
  border: 1px dashed ${c.lineStrong};
  border-radius: ${radius.md};
  color: ${c.muted};
  font-size: 0.875rem;
  text-align: center;
`;
