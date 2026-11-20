'use client';

import { Check, Copy, Gamepad2, ListChecks, MessageCircle, Timer } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState, type KeyboardEvent } from 'react';
import styled, { keyframes } from 'styled-components';
import { toast } from 'sonner';
import { useMenuUi, useTrackedOrder } from '@/client/cart-store';
import { formatBRL } from '@/lib/money';
import { formatOrderNumber, FULFILLMENT_LABELS, isFinalStatus, PAYMENT_LABELS, TRACKING_STEPS, trackingLabel } from '@/lib/order';
import { formatClock } from '@/lib/schedule';
import { formatAddressLine } from '@/lib/site';
import type { Order, StoreSettings } from '@/lib/types';
import { buildOrderMessage, whatsappLink } from '@/lib/whatsapp';
import { c, ease, font, mq, radius } from '@/styles/tokens';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Skeleton } from '../ui/Skeleton';
import { useStore } from './StoreProvider';
import { StatusIcon } from './TrackOrderButton';

/** O jogo só é baixado quando a pessoa abre a aba "Jogar enquanto espera". */
const BurgerGame = dynamic(() => import('./game/BurgerGame'), {
  ssr: false,
  loading: () => <GameSkeleton role="status" aria-label="Carregando o jogo" />,
});

type Tab = 'status' | 'jogo';

function statusText(order: Order, settings: StoreSettings, lost: boolean): string {
  if (lost) return 'Este pedido foi encerrado no fechamento do dia. Para qualquer dúvida, fale com a loja.';
  const delivery = order.fulfillment.type === 'delivery';
  switch (order.status) {
    case 'novo':
      return `A cozinha da ${settings.name} recebeu seu pedido às ${formatClock(order.createdAt)}. O andamento muda aqui assim que a loja aceitar.`;
    case 'preparando':
      return 'Seu pedido está sendo preparado agora.';
    case 'despachado':
      return delivery
        ? 'Seu pedido está a caminho. Deixe o WhatsApp por perto.'
        : `Pode vir buscar no balcão: ${formatAddressLine(settings.address)}.`;
    case 'concluido':
      return delivery ? 'Pedido entregue. Bom apetite e obrigado pela preferência.' : 'Pedido retirado. Bom apetite e obrigado pela preferência.';
    case 'cancelado':
      return 'A loja cancelou este pedido. Se tiver dúvida, fale com a loja pelo WhatsApp.';
  }
}

export function SuccessPanel() {
  const { settings } = useStore();
  const panel = useMenuUi((s) => s.panel);
  const openPanel = useMenuUi((s) => s.openPanel);
  const order = useTrackedOrder((s) => s.order);
  const lost = useTrackedOrder((s) => s.lost);
  const [tab, setTab] = useState<Tab>('status');
  const [gameMounted, setGameMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const open = panel === 'success';
  const [wasOpen, setWasOpen] = useState(open);

  // Cada abertura começa pelo acompanhamento (estado derivado, sem efeito).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTab('status');
  }

  if (!order) return null;
  const message = buildOrderMessage(order, settings);
  const final = isFinalStatus(order.status) || lost;
  const cancelled = order.status === 'cancelado';
  const currentIndex = TRACKING_STEPS.indexOf(order.status as (typeof TRACKING_STEPS)[number]);
  const label = lost ? 'Acompanhamento encerrado' : trackingLabel(order.status, order.fulfillment.type);

  const selectTab = (next: Tab) => {
    setTab(next);
    if (next === 'jogo') setGameMounted(true);
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next: Tab = tab === 'status' ? 'jogo' : 'status';
    selectTab(next);
    document.getElementById(next === 'status' ? 'aba-acompanhar' : 'aba-jogo')?.focus();
  };

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(settings.pixKey);
      setCopied(true);
      toast.success('Chave Pix copiada');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Selecione a chave e copie manualmente.');
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => openPanel(value ? 'success' : null)}
      title={`Pedido ${formatOrderNumber(order.number)}`}
      desktop="center"
      footer={
        <Actions>
          {settings.whatsapp ? (
            <Button as="a" href={whatsappLink(settings.whatsapp, message)} target="_blank" rel="noopener noreferrer" data-block="true" data-size="lg">
              <MessageCircle aria-hidden />
              Enviar Pedido no WhatsApp
            </Button>
          ) : null}
          <Button type="button" data-variant="secondary" data-block="true" onClick={() => openPanel(null)}>
            Fazer outro pedido
          </Button>
        </Actions>
      }
    >
      <TabList role="tablist" aria-label="Seu pedido">
        <TabButton
          type="button"
          role="tab"
          id="aba-acompanhar"
          aria-selected={tab === 'status'}
          aria-controls="painel-acompanhar"
          tabIndex={tab === 'status' ? 0 : -1}
          onClick={() => selectTab('status')}
          onKeyDown={onTabKey}
        >
          <ListChecks aria-hidden />
          Acompanhar
        </TabButton>
        <TabButton
          type="button"
          role="tab"
          id="aba-jogo"
          aria-selected={tab === 'jogo'}
          aria-controls="painel-jogo"
          tabIndex={tab === 'jogo' ? 0 : -1}
          onClick={() => selectTab('jogo')}
          onKeyDown={onTabKey}
        >
          <Gamepad2 aria-hidden />
          Jogar enquanto espera
        </TabButton>
      </TabList>

      <div role="tabpanel" id="painel-acompanhar" aria-labelledby="aba-acompanhar" hidden={tab !== 'status'}>
        <Content>
          <Head data-tone={cancelled || lost ? 'off' : final ? 'done' : 'live'}>
            <HeadBadge key={order.status} aria-hidden>
              <StatusIcon status={order.status} fulfillment={order.fulfillment.type} />
            </HeadBadge>
            <div>
              <Heading>{label}</Heading>
              <Lead>{statusText(order, settings, lost)}</Lead>
            </div>
          </Head>

          {!final ? (
            <Live role="note">
              <span data-dot aria-hidden />
              Atualiza sozinho enquanto esta tela estiver aberta.
              {settings.etaText ? (
                <span data-eta>
                  <Timer aria-hidden /> Tempo estimado: {settings.etaText}
                </span>
              ) : null}
            </Live>
          ) : null}

          <Steps aria-label="Andamento do pedido">
            {TRACKING_STEPS.map((step, index) => {
              const at = order.statusHistory?.[step];
              const state = cancelled
                ? at
                  ? 'done'
                  : 'off'
                : index < currentIndex || (index === currentIndex && final)
                  ? 'done'
                  : index === currentIndex
                    ? 'current'
                    : 'todo';
              return (
                <li key={step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                  <span data-icon aria-hidden>
                    {state === 'done' ? <Check /> : <StatusIcon status={step} fulfillment={order.fulfillment.type} />}
                  </span>
                  <span data-text>
                    <strong>{trackingLabel(step, order.fulfillment.type)}</strong>
                    {at ? <time dateTime={new Date(at).toISOString()}>{formatClock(at)}</time> : null}
                  </span>
                </li>
              );
            })}
          </Steps>

          {order.payment.method === 'pix' && settings.pixKey && !cancelled ? (
            <Pix>
              <p>Chave Pix da loja</p>
              <code>{settings.pixKey}</code>
              <Button type="button" data-size="sm" data-variant="secondary" onClick={copyPix}>
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copied ? 'Chave copiada' : 'Copiar chave Pix'}
              </Button>
            </Pix>
          ) : null}

          <Details>
            <div>
              <dt>Recebimento</dt>
              <dd>
                {FULFILLMENT_LABELS[order.fulfillment.type]}
                {order.fulfillment.address ? `: ${order.fulfillment.address.street}, ${order.fulfillment.address.number}` : ''}
              </dd>
            </div>
            <div>
              <dt>Pagamento</dt>
              <dd>
                {PAYMENT_LABELS[order.payment.method]}
                {order.payment.method === 'cash' && order.payment.changeFor ? `, troco para ${formatBRL(order.payment.changeFor)}` : ''}
              </dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>
                {formatBRL(order.total)}
                {order.fulfillment.type === 'delivery' && order.deliveryFee === null ? ' + entrega' : ''}
              </dd>
            </div>
          </Details>
          <Items role="list" aria-label="Itens do pedido">
            {order.items.map((item, index) => (
              <li key={`${item.productId}-${index}`}>
                <span>
                  {item.quantity}x {item.name}
                  {item.drink ? <small>Bebida: {item.drink.name}</small> : null}
                  {item.note ? <small>Obs.: {item.note}</small> : null}
                </span>
                <span>{formatBRL(item.total)}</span>
              </li>
            ))}
          </Items>
          {settings.whatsapp ? (
            <Hint>Seu pedido já chegou na loja pelo site. O WhatsApp é para enviar o comprovante ou conversar com a equipe.</Hint>
          ) : null}
        </Content>
      </div>

      <div role="tabpanel" id="painel-jogo" aria-labelledby="aba-jogo" hidden={tab !== 'jogo'}>
        {gameMounted ? (
          <GameArea>
            <Strip key={order.status} role="status" data-tone={cancelled ? 'off' : final ? 'done' : 'live'}>
              <StatusIcon status={order.status} fulfillment={order.fulfillment.type} aria-hidden />
              <span>
                Pedido {formatOrderNumber(order.number)}: <strong>{label}</strong>
              </span>
            </Strip>
            <BurgerGame active={open && tab === 'jogo'} />
          </GameArea>
        ) : null}
      </div>
    </Sheet>
  );
}

const pop = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const flash = keyframes`
  0% { background-color: var(--amber-soft); }
  100% { background-color: var(--paper-2); }
`;

const TabList = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.5fr);
  gap: 4px;
  margin-bottom: 18px;
  padding: 4px;
  border-radius: ${radius.md};
  background: ${c.paper2};
`;

const TabButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 8px;
  border: 0;
  border-radius: ${radius.sm};
  background: transparent;
  color: ${c.inkSoft};
  font-size: 0.875rem;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;

  ${mq.sm} {
    padding: 0 10px;
    font-size: 0.9375rem;
  }
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;

  svg {
    flex: none;
    width: 18px;
    height: 18px;
  }

  &[aria-selected='true'] {
    background: ${c.surface};
    color: ${c.ink};
    box-shadow: 0 1px 2px rgba(28, 22, 17, 0.12);
  }

  &:focus-visible {
    outline: 2px solid ${c.focus};
    outline-offset: 1px;
  }
`;

const Content = styled.div`
  display: grid;
  gap: 16px;
`;

const Head = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: start;

  --tone: ${c.amber};
  &[data-tone='done'] {
    --tone: ${c.green};
  }
  &[data-tone='off'] {
    --tone: ${c.red};
  }
`;

const HeadBadge = styled.div`
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: ${radius.lg};
  background: var(--tone);
  color: #fff;
  animation: ${pop} 360ms ${ease.out} both;

  svg {
    width: 26px;
    height: 26px;
  }

  ${mq.reduced} {
    animation: none;
  }
`;

const Heading = styled.h3`
  font-family: ${font.display};
  font-size: 1.625rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const Lead = styled.p`
  margin-top: 4px;
  color: ${c.inkSoft};
`;

const Live = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  font-size: 0.875rem;
  color: ${c.muted};

  span[data-dot] {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${c.green};
    box-shadow: 0 0 0 3px ${c.greenSoft};
  }

  span[data-eta] {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: ${c.inkSoft};

    svg {
      width: 16px;
      height: 16px;
      color: ${c.amberInk};
    }
  }
`;

const Steps = styled.ol`
  display: grid;
  gap: 0;
  margin: 0;
  padding: 4px 0;
  list-style: none;

  li {
    position: relative;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    min-height: 52px;
  }

  /* Linha que liga as etapas. */
  li:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 17px;
    top: 42px;
    bottom: -6px;
    width: 2px;
    background: ${c.line};
  }
  li[data-state='done']:not(:last-child)::after {
    background: ${c.green};
  }

  span[data-icon] {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1.5px solid ${c.lineStrong};
    border-radius: 50%;
    background: ${c.surface};
    color: ${c.muted};
    transition:
      background-color 240ms ease,
      border-color 240ms ease,
      color 240ms ease;

    svg {
      width: 18px;
      height: 18px;
    }
  }

  li[data-state='done'] span[data-icon] {
    border-color: ${c.green};
    background: ${c.green};
    color: #fff;
  }
  li[data-state='current'] span[data-icon] {
    border-color: ${c.amberInk};
    background: ${c.amberSoft};
    color: ${c.amberInk};
  }
  li[data-state='off'] {
    opacity: 0.5;
  }

  span[data-text] {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  strong {
    font-weight: 650;
    color: ${c.muted};
  }
  li[data-state='done'] strong,
  li[data-state='current'] strong {
    color: ${c.ink};
  }

  time {
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
    color: ${c.muted};
  }
`;

const Pix = styled.div`
  display: grid;
  gap: 8px;
  justify-items: start;
  padding: 14px 16px;
  border: 1px dashed ${c.lineStrong};
  border-radius: ${radius.md};

  p {
    font-size: 0.875rem;
    font-weight: 600;
    color: ${c.muted};
  }

  code {
    font-size: 1rem;
    font-weight: 600;
    overflow-wrap: anywhere;
    user-select: all;
  }
`;

const Details = styled.dl`
  display: grid;
  gap: 0;
  margin: 0;
  border-top: 1px solid ${c.line};

  div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid ${c.line};
  }

  dt {
    color: ${c.muted};
  }

  dd {
    margin: 0;
    text-align: right;
    font-weight: 600;
  }
`;

const Items = styled.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9375rem;

  li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-variant-numeric: tabular-nums;
  }

  small {
    display: block;
    color: ${c.muted};
    font-size: 0.8125rem;
  }
`;

const Hint = styled.p`
  font-size: 0.875rem;
  color: ${c.muted};
`;

const GameArea = styled.div`
  display: grid;
  gap: 12px;
`;

const Strip = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: ${radius.md};
  background: ${c.paper2};
  font-size: 0.9375rem;
  animation: ${flash} 1200ms ease;

  svg {
    flex: none;
    width: 18px;
    height: 18px;
    color: ${c.amberInk};
  }
  &[data-tone='done'] svg {
    color: ${c.green};
  }
  &[data-tone='off'] svg {
    color: ${c.red};
  }

  ${mq.reduced} {
    animation: none;
  }
`;

const GameSkeleton = styled(Skeleton)`
  display: block;
  width: 100%;
  height: 404px;
  border-radius: ${radius.lg};

  ${mq.md} {
    height: 444px;
  }
`;

const Actions = styled.div`
  display: grid;
  gap: 10px;
`;
