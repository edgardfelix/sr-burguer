'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, BellRing, Check, ChefHat, CircleCheckBig, Clock3, Inbox, Bike, Printer, Store, Timer, X, Zap } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { summarizeHours } from '@/lib/schedule';
import { c, ease, font, mq, radius } from '@/styles/tokens';
import { Logo } from '../site/Logo';
import { Button, IconButton } from '../ui/Button';
import { useAdmin } from './AdminData';

interface Step {
  title: string;
  body: ReactNode;
  art: ReactNode;
}

export function TutorialModal({ open }: { open: boolean }) {
  const { completeTutorial, settings } = useAdmin();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [wasOpen, setWasOpen] = useState(open);
  const reduce = useReducedMotion();

  // Cada abertura (inclusive por "Ver tutorial") recomeça do primeiro passo.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setIndex(0);
      setDirection(1);
    }
  }
  const hours = summarizeHours(settings.hours).join('; ') || 'o horário cadastrado';

  const steps: Step[] = [
    {
      title: 'Bem-vindo ao painel da SR Burguer',
      body: (
        <>
          <p>Daqui você acompanha os pedidos do site em tempo real e mantém o cardápio, as promoções e o horário sempre certos.</p>
          <p>São quatro áreas no menu lateral: Pedidos, Cardápio, Promoções e Loja e horário.</p>
        </>
      ),
      art: <ArtWelcome />,
    },
    {
      title: 'Os pedidos chegam sozinhos',
      body: (
        <>
          <p>Cada pedido novo toca uma campainha, aparece na coluna Novos e muda o título da aba. Não precisa recarregar a página.</p>
          <p>Deixe esta aba aberta no computador do balcão. Se aparecer o aviso do navegador, clique em Ativar alerta sonoro.</p>
        </>
      ),
      art: <ArtOrder />,
    },
    {
      title: 'Do aceite à entrega',
      body: (
        <>
          <p>Use o botão principal de cada pedido para avançar: aceitar, preparar, saiu para entrega (ou pronto para retirada) e concluir.</p>
          <p>O botão de impressora gera a comanda para a cozinha. Pagamento em dinheiro mostra quanto levar de troco.</p>
        </>
      ),
      art: <ArtPipeline />,
    },
    {
      title: 'Preços e itens do cardápio',
      body: (
        <>
          <p>Em Cardápio você troca preços, fotos e descrições. O site atualiza assim que você salva.</p>
          <p>Acabou um ingrediente? Desligue o interruptor do item: ele some do cardápio na hora, sem apagar nada.</p>
        </>
      ),
      art: <ArtMenu />,
    },
    {
      title: 'Promoção relâmpago',
      body: (
        <>
          <p>Em Promoções, escolha o item, o preço promocional e por quanto tempo vale. O site mostra o preço antigo riscado e a promoção encerra sozinha no horário.</p>
          <p>Ali também fica o aviso que aparece no topo do cardápio.</p>
        </>
      ),
      art: <ArtPromo />,
    },
    {
      title: 'Abrir e fechar a loja',
      body: (
        <>
          <p>
            No modo Automático a loja segue o horário de funcionamento: {hours}. Fora dele o site aceita montar o pedido, mas não deixa enviar.
          </p>
          <p>Imprevisto? Use Fechar no topo do painel para pausar os pedidos na hora, e Automático para voltar ao normal.</p>
        </>
      ),
      art: <ArtSwitch />,
    },
    {
      title: 'Antes de começar',
      body: (
        <>
          <p>Três ajustes deixam tudo pronto. Eles ficam em Loja e horário:</p>
          <Checklist>
            <li data-done={Boolean(settings.whatsapp)}>
              <Check aria-hidden /> WhatsApp da loja, para o cliente enviar o resumo do pedido
            </li>
            <li data-done={settings.deliveryFee !== null}>
              <Check aria-hidden /> Taxa de entrega
            </li>
            <li data-done={Boolean(settings.pixKey)}>
              <Check aria-hidden /> Chave Pix
            </li>
          </Checklist>
          <p>
            Depois faça um pedido de teste pelo <a href="/" target="_blank" rel="noopener noreferrer">cardápio público</a> e veja ele chegar aqui.
          </p>
        </>
      ),
      art: <ArtChecklist />,
    },
  ];

  const last = index === steps.length - 1;
  const go = (delta: number) => {
    setDirection(delta);
    setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + delta)));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setDirection(1);
        setIndex((i) => Math.min(steps.length - 1, i + 1));
      }
      if (event.key === 'ArrowLeft') {
        setDirection(-1);
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, steps.length]);

  const step = steps[index] as Step;
  const offset = reduce ? 0 : 24;

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && void completeTutorial()}>
      <Dialog.Portal>
        <Overlay />
        <Content aria-describedby="tutorial-texto">
          <Art>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={index}
                initial={{ opacity: 0, x: direction * offset, filter: reduce ? 'none' : 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -direction * offset, filter: reduce ? 'none' : 'blur(4px)' }}
                transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                className="art-inner"
              >
                {step.art}
              </motion.div>
            </AnimatePresence>
          </Art>
          <Text>
            <Top>
              <Progress aria-label={`Passo ${index + 1} de ${steps.length}`}>
                {steps.map((s, i) => (
                  <span key={s.title} data-active={i === index} data-done={i < index} />
                ))}
              </Progress>
              <Dialog.Close asChild>
                <IconButton aria-label="Pular tutorial" data-size="sm">
                  <X aria-hidden />
                </IconButton>
              </Dialog.Close>
            </Top>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="text-inner"
              >
                <small>
                  Passo {index + 1} de {steps.length}
                </small>
                <Dialog.Title asChild>
                  <h2>{step.title}</h2>
                </Dialog.Title>
                <div id="tutorial-texto">{step.body}</div>
              </motion.div>
            </AnimatePresence>
            <Nav>
              <Button type="button" data-variant="ghost" data-size="sm" onClick={() => go(-1)} disabled={index === 0}>
                <ArrowLeft aria-hidden /> Voltar
              </Button>
              {last ? (
                <Button type="button" data-size="sm" onClick={() => void completeTutorial()}>
                  Começar a usar <Check aria-hidden />
                </Button>
              ) : (
                <Button type="button" data-size="sm" onClick={() => go(1)}>
                  Próximo <ArrowRight aria-hidden />
                </Button>
              )}
            </Nav>
            {last ? <Hint>Você pode rever este guia quando quiser em Ver tutorial, no menu lateral.</Hint> : null}
          </Text>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ------------------------------------------------------------------ ilustrações

function ArtWelcome() {
  return (
    <Mock>
      <MockSide>
        <Logo size={30} tone="light" showName={false} />
        {['Pedidos', 'Cardápio', 'Promoções', 'Loja e horário'].map((label, i) => (
          <span key={label} data-active={i === 0}>
            {label}
          </span>
        ))}
      </MockSide>
      <MockMain>
        <div className="bars">
          <i />
          <i />
          <i />
        </div>
        <div className="cards">
          <b />
          <b />
          <b />
        </div>
      </MockMain>
    </Mock>
  );
}

function ArtOrder() {
  return (
    <Center>
      <Bell>
        <BellRing aria-hidden />
      </Bell>
      <MiniCard data-new>
        <div className="row">
          <strong>#0012</strong>
          <span>Entrega</span>
        </div>
        <p>Maria S. · 2x SR Salad Bacon</p>
        <p className="total">R$ 69,80</p>
        <em>Aceitar e preparar</em>
      </MiniCard>
    </Center>
  );
}

function ArtPipeline() {
  const steps = [
    { icon: Inbox, label: 'Novo' },
    { icon: ChefHat, label: 'Em preparo' },
    { icon: Bike, label: 'Saiu ou pronto' },
    { icon: CircleCheckBig, label: 'Concluído' },
  ];
  return (
    <Pipeline>
      {steps.map(({ icon: Icon, label }, i) => (
        <div key={label} style={{ ['--i' as string]: i }}>
          <span>
            <Icon aria-hidden />
          </span>
          {label}
        </div>
      ))}
      <p>
        <Printer aria-hidden /> Comanda impressa em um clique
      </p>
    </Pipeline>
  );
}

function ArtMenu() {
  return (
    <Center>
      {[
        ['SR Salad Bacon', 'R$ 29,99', true],
        ['SR Cheddar Melt', 'R$ 29,99', true],
        ['Pepsi 200 ml', 'R$ 6,00', false],
      ].map(([name, price, on]) => (
        <MiniRow key={String(name)} data-on={on}>
          <span className="thumb" />
          <span className="name">{name}</span>
          <span className="price">{price}</span>
          <span className="switch">
            <i />
          </span>
        </MiniRow>
      ))}
    </Center>
  );
}

function ArtPromo() {
  return (
    <Center>
      <PromoCard>
        <span className="tag">
          <Zap aria-hidden /> Promoção
        </span>
        <strong>SR Salad Bacon</strong>
        <div className="prices">
          <s>R$ 29,99</s>
          <b>R$ 26,99</b>
        </div>
        <span className="timer">
          <Timer aria-hidden /> termina às 22:00
        </span>
      </PromoCard>
    </Center>
  );
}

function ArtSwitch() {
  return (
    <Center>
      <ModeMock>
        <span className="status">
          <i /> Aberto agora
        </span>
        <div>
          <span data-on>Automático</span>
          <span>Abrir</span>
          <span>Fechar</span>
        </div>
      </ModeMock>
      <Hours>
        <Clock3 aria-hidden /> Terça a domingo, 16:00 às 23:00
      </Hours>
    </Center>
  );
}

function ArtChecklist() {
  return (
    <Center>
      <Store aria-hidden style={{ width: 56, height: 56, color: 'var(--amber)' }} />
      <p style={{ color: 'var(--cream)', fontFamily: 'var(--font-display)', fontSize: 22, textAlign: 'center' }}>Tudo pronto para vender</p>
    </Center>
  );
}

// ------------------------------------------------------------------ estilos

const fade = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const rise = keyframes`
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const Overlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(23, 17, 13, 0.6);
  animation: ${fade} 240ms ease;
`;

const Content = styled(Dialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 81;
  display: grid;
  width: min(880px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  border-radius: 14px;
  background: ${c.surface};
  box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 0.55);
  transform: translate(-50%, -50%);
  animation: ${rise} 320ms ${ease.out};
  outline: none;

  ${mq.md} {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    min-height: 460px;
  }
`;

const Art = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  min-height: 240px;
  padding: 28px;
  background: ${c.night};
  overflow: hidden;

  .art-inner {
    width: 100%;
    display: grid;
    place-items: center;
  }
`;

const Text = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 28px 28px;

  .text-inner {
    display: grid;
    gap: 12px;
    flex: 1;
    align-content: start;
  }

  small {
    font-size: 0.8125rem;
    font-weight: 700;
    color: ${c.amberInk};
  }

  h2 {
    font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
  }

  p {
    color: ${c.inkSoft};
  }

  #tutorial-texto {
    display: grid;
    gap: 10px;
  }

  a {
    font-weight: 600;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Progress = styled.div`
  display: flex;
  gap: 6px;

  span {
    width: 18px;
    height: 4px;
    border-radius: 2px;
    background: ${c.line};
    transition:
      background-color 240ms ease,
      width 240ms ${ease.out};
  }
  span[data-done='true'] {
    background: ${c.amberInk};
  }
  span[data-active='true'] {
    width: 32px;
    background: ${c.ink};
  }
`;

const Nav = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const Hint = styled.p`
  font-size: 0.875rem;
`;

const Checklist = styled.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-weight: 500;
  }

  svg {
    flex: none;
    width: 18px;
    height: 18px;
    margin-top: 2px;
    padding: 2px;
    border-radius: 4px;
    background: ${c.line};
    color: transparent;
  }

  li[data-done='true'] svg {
    background: ${c.green};
    color: #fff;
  }
`;

const Center = styled.div`
  display: grid;
  justify-items: center;
  gap: 12px;
  width: 100%;
  max-width: 300px;
`;

const Mock = styled.div`
  display: grid;
  grid-template-columns: 96px 1fr;
  width: 100%;
  max-width: 320px;
  height: 200px;
  border-radius: ${radius.md};
  overflow: hidden;
  border: 1px solid rgba(243, 232, 214, 0.12);
`;

const MockSide = styled.div`
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 10px;
  background: ${c.night2};

  span {
    padding: 5px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    color: ${c.creamMuted};
  }
  span[data-active='true'] {
    background: rgba(243, 232, 214, 0.08);
    color: ${c.cream};
    box-shadow: inset 2px 0 0 ${c.amber};
  }
`;

const MockMain = styled.div`
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 12px;
  background: ${c.paper};

  .bars {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .bars i {
    height: 26px;
    border-radius: 4px;
    background: ${c.surface};
    border: 1px solid ${c.line};
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .cards b {
    height: 110px;
    border-radius: 5px;
    background: ${c.paper2};
  }
  .cards b:first-child {
    background: #f3e3c6;
    box-shadow: inset 0 0 0 1px ${c.amber};
  }
`;

const Bell = styled.div`
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: ${c.amber};
  color: ${c.ink};

  svg {
    width: 26px;
    height: 26px;
    animation: bb-ring 1.6s ${ease.inOut} 2;
    transform-origin: 50% 10%;
  }

  @keyframes bb-ring {
    0%,
    60%,
    100% {
      transform: rotate(0);
    }
    10%,
    30% {
      transform: rotate(14deg);
    }
    20%,
    40% {
      transform: rotate(-14deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      animation: none;
    }
  }
`;

const MiniCard = styled.div`
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  background: ${c.surface};
  box-shadow:
    0 0 0 1px ${c.amber},
    0 12px 30px -12px rgba(0, 0, 0, 0.5);
  font-size: 13px;

  .row {
    display: flex;
    justify-content: space-between;
  }
  .row span {
    padding: 1px 6px;
    border-radius: 4px;
    background: ${c.ink};
    color: ${c.paper};
    font-size: 11px;
    font-weight: 700;
  }
  strong {
    font-family: ${font.display};
    font-size: 17px;
  }
  .total {
    font-weight: 800;
  }
  em {
    padding: 7px;
    border-radius: 6px;
    background: ${c.ink};
    color: ${c.paper};
    font-style: normal;
    font-weight: 700;
    text-align: center;
  }
`;

const Pipeline = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
  max-width: 280px;

  div {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(243, 232, 214, 0.06);
    color: ${c.cream};
    font-weight: 600;
    font-size: 14px;
    animation: bb-step-in 420ms ${ease.out} both;
    animation-delay: calc(var(--i) * 70ms);
  }

  div span {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: ${c.amber};
    color: ${c.ink};
  }

  svg {
    width: 16px;
    height: 16px;
  }

  p {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    color: ${c.creamMuted};
    font-size: 13px;
  }

  @keyframes bb-step-in {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
`;

const MiniRow = styled.div`
  display: grid;
  grid-template-columns: 34px 1fr auto auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  background: ${c.surface};
  font-size: 13px;

  .thumb {
    width: 34px;
    height: 26px;
    border-radius: 4px;
    background: ${c.amberSoft};
  }
  .name {
    font-weight: 600;
  }
  .price {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .switch {
    position: relative;
    width: 30px;
    height: 18px;
    border-radius: 5px;
    background: rgba(28, 22, 17, 0.22);
  }
  .switch i {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 4px;
    background: #fff;
  }

  &[data-on='true'] .switch {
    background: ${c.green};
  }
  &[data-on='true'] .switch i {
    transform: translateX(12px);
  }
  &[data-on='false'] {
    opacity: 0.6;
  }
`;

const PromoCard = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  background: ${c.surface};

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    width: fit-content;
    padding: 2px 8px;
    border-radius: 4px;
    background: ${c.red};
    color: #fff8ee;
    font-size: 12px;
    font-weight: 700;
  }
  .tag svg {
    width: 13px;
    height: 13px;
  }
  strong {
    font-size: 16px;
  }
  .prices {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }
  s {
    color: ${c.muted};
  }
  b {
    font-size: 22px;
    color: ${c.red};
  }
  .timer {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: ${c.amberInk};
  }
  .timer svg {
    width: 14px;
    height: 14px;
  }
`;

const ModeMock = styled.div`
  display: grid;
  gap: 10px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  background: ${c.surface};

  .status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 14px;
  }
  .status i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${c.green};
  }
  div {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
    padding: 3px;
    border-radius: 6px;
    background: ${c.paper2};
  }
  div span {
    padding: 6px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    color: ${c.muted};
  }
  div span[data-on] {
    background: ${c.ink};
    color: ${c.paper};
  }
`;

const Hours = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${c.cream};
  font-size: 13px;

  svg {
    width: 16px;
    height: 16px;
    color: ${c.amber};
  }
`;
