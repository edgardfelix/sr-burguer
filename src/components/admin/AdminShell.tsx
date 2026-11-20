'use client';

import {
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  LogOut,
  RefreshCcw,
  Store,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { toast } from 'sonner';
import { useNow } from '@/client/hooks';
import { computeStoreStatus, describeStatus } from '@/lib/schedule';
import type { StoreMode } from '@/lib/types';
import { c, ease, font, mq, radius } from '@/styles/tokens';
import { Logo } from '../site/Logo';
import { Button, IconButton } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { AdminDataProvider, useAdmin } from './AdminData';
import { TutorialModal } from './TutorialModal';

const NAV = [
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { href: '/admin/promocoes', label: 'Promoções', icon: Zap },
  { href: '/admin/loja', label: 'Loja e horário', icon: Store },
];

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <AdminDataProvider>
      <Frame email={email}>{children}</Frame>
    </AdminDataProvider>
  );
}

function Frame({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const admin = useAdmin();
  const pending = admin.orders.filter((o) => o.status === 'novo').length;
  const current = NAV.find((n) => pathname?.startsWith(n.href));

  return (
    <Layout>
      <Sidebar aria-label="Menu do painel">
        <Brand>
          <Logo size={36} tone="light" showName={false} />
          <div>
            <strong>SR Burguer</strong>
            <span>Painel da loja</span>
          </div>
        </Brand>
        <Nav>
          {/*
            As rotas do painel são dinâmicas (sessão conferida no servidor) e por padrão não seriam pré-carregadas.
            prefetch explícito busca cada aba por inteiro assim que o menu aparece: a troca de aba fica instantânea.
          */}
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} prefetch aria-current={pathname?.startsWith(href) ? 'page' : undefined}>
              <Icon aria-hidden />
              <span>{label}</span>
              {href === '/admin/pedidos' && pending > 0 ? <Badge aria-label={`${pending} pedidos novos`}>{pending}</Badge> : null}
            </Link>
          ))}
        </Nav>
        <SideFoot>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden /> Ver cardápio público
          </a>
          <button type="button" onClick={admin.openTutorial}>
            <GraduationCap aria-hidden /> Ver tutorial
          </button>
          <button type="button" onClick={() => void admin.logout()}>
            <LogOut aria-hidden /> Sair
          </button>
          <small title={email}>{email}</small>
        </SideFoot>
      </Sidebar>

      <Main>
        <Topbar>
          <h1>{current?.label ?? 'Painel'}</h1>
          <TopActions>
            <StoreModeControl />
            <ConnectionBadge />
            <SoundButton />
            <NotificationButton />
          </TopActions>
        </Topbar>
        <AudioGate />
        <Problems />
        <Content id="conteudo">
          {admin.phase === 'loading' ? <LoadingState /> : admin.phase === 'error' ? <ErrorState /> : children}
        </Content>
      </Main>
      {admin.phase === 'ready' ? <TutorialModal open={admin.tutorialOpen} /> : null}
    </Layout>
  );
}

function StoreModeControl() {
  const { settings, adminFetch, setSettingsLocal, phase } = useAdmin();
  const now = useNow(0);
  const [saving, setSaving] = useState(false);
  const clockReady = now > 0;
  const status = computeStoreStatus(settings, now);
  const text = describeStatus(status, now);

  const change = async (mode: StoreMode) => {
    if (mode === settings.mode) return;
    const previous = settings;
    setSettingsLocal({ ...settings, mode });
    setSaving(true);
    try {
      await adminFetch('/api/admin/settings/mode', { method: 'PATCH', json: { mode } });
      toast.success(mode === 'auto' ? 'Loja seguindo o horário de funcionamento' : mode === 'open' ? 'Loja aberta para pedidos' : 'Pedidos pausados');
    } catch {
      setSettingsLocal(previous);
      toast.error('Não foi possível mudar o status da loja.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModeBox data-open={phase === 'ready' && clockReady ? status.isOpen : undefined}>
      <span title={clockReady ? text.detail : undefined}>
        <i aria-hidden />
        {phase === 'ready' && clockReady ? text.title : 'Carregando'}
      </span>
      <ModeButtons role="radiogroup" aria-label="Status da loja">
        {(
          [
            ['auto', 'Automático'],
            ['open', 'Abrir'],
            ['closed', 'Fechar'],
          ] as const
        ).map(([mode, label]) => (
          <button key={mode} type="button" role="radio" aria-checked={settings.mode === mode} disabled={saving || phase !== 'ready'} onClick={() => void change(mode)}>
            {label}
          </button>
        ))}
      </ModeButtons>
    </ModeBox>
  );
}

function ConnectionBadge() {
  const { connected, realtimeMode, phase } = useAdmin();
  if (phase !== 'ready') return null;
  const label = !connected ? 'Sem conexão' : realtimeMode === 'firebase' ? 'Tempo real' : 'Atualização a cada 3 s';
  return (
    <Conn data-state={connected ? 'ok' : 'off'} title={realtimeMode === 'firebase' ? 'Conectado ao Firebase em tempo real' : 'Modo local: o painel consulta os pedidos a cada 3 segundos'}>
      {connected ? <Wifi aria-hidden /> : <WifiOff aria-hidden />}
      <span>{label}</span>
    </Conn>
  );
}

function SoundButton() {
  const { sound } = useAdmin();
  return (
    <IconButton type="button" data-variant="outline" aria-pressed={sound.enabled} aria-label={sound.enabled ? 'Desligar alerta sonoro' : 'Ligar alerta sonoro'} title={sound.enabled ? 'Alerta sonoro ligado' : 'Alerta sonoro desligado'} onClick={sound.toggle}>
      {sound.enabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
    </IconButton>
  );
}

function NotificationButton() {
  const { notifications } = useAdmin();
  if (notifications.permission === 'unsupported') return null;
  const granted = notifications.permission === 'granted';
  const denied = notifications.permission === 'denied';
  return (
    <IconButton
      type="button"
      data-variant="outline"
      aria-label={granted ? 'Notificações do navegador ativas' : denied ? 'Notificações bloqueadas no navegador' : 'Ativar notificações do navegador'}
      title={granted ? 'Notificações ativas' : denied ? 'Desbloqueie nas configurações do navegador' : 'Avisar quando a aba estiver em segundo plano'}
      onClick={() => void notifications.request()}
      disabled={granted || denied}
    >
      {granted ? <BellRing aria-hidden /> : denied ? <BellOff aria-hidden /> : <Bell aria-hidden />}
    </IconButton>
  );
}

function AudioGate() {
  const { sound, phase } = useAdmin();
  if (phase !== 'ready' || !sound.enabled || sound.audio === 'running') return null;
  return (
    <Gate role="alert">
      <Volume2 aria-hidden />
      <p>O navegador bloqueia sons até o primeiro clique. Ative o alerta para ouvir cada pedido novo.</p>
      <Button type="button" data-size="sm" data-variant="accent" onClick={() => void sound.unlock()}>
        Ativar alerta sonoro
      </Button>
    </Gate>
  );
}

function Problems() {
  const { session, phase } = useAdmin();
  if (phase !== 'ready' || !session?.problems.length) return null;
  return (
    <Warn>
      <AlertTriangle aria-hidden />
      <div>
        <strong>{session.driver === 'local' ? 'Modo local de desenvolvimento' : 'Configuração pendente'}</strong>
        <ul>
          {session.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
          {session.driver === 'local' ? <li>Os dados ficam em .data/db.json neste computador. Configure o Firebase antes de publicar.</li> : null}
        </ul>
      </div>
    </Warn>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Carregando o painel" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} style={{ height: 88, borderRadius: 10 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} style={{ height: 360, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}

function ErrorState() {
  const { error } = useAdmin();
  return (
    <Warn>
      <AlertTriangle aria-hidden />
      <div>
        <strong>Não foi possível carregar o painel</strong>
        <p>{error}</p>
        <Button type="button" data-size="sm" onClick={() => window.location.reload()}>
          <RefreshCcw aria-hidden /> Recarregar
        </Button>
      </div>
    </Warn>
  );
}

const Layout = styled.div`
  min-height: 100svh;
  background: ${c.paper};

  ${mq.lg} {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr);
  }
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  background: ${c.night};
  color: ${c.cream};

  ${mq.lg} {
    position: sticky;
    top: 0;
    height: 100svh;
    padding: 22px 16px;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 6px;

  div {
    display: grid;
    line-height: 1.2;
  }
  strong {
    font-family: ${font.display};
    font-size: 1.0625rem;
  }
  span {
    font-size: 0.8125rem;
    color: ${c.creamMuted};
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 4px;
  overflow-x: auto;

  ${mq.lg} {
    flex-direction: column;
    overflow: visible;
  }

  a {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    padding: 0 12px;
    border-radius: ${radius.md};
    color: ${c.creamMuted};
    font-weight: 600;
    font-size: 0.9375rem;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }

  a svg {
    width: 19px;
    height: 19px;
    flex: none;
  }

  a[aria-current='page'] {
    background: ${c.night2};
    color: ${c.cream};
    box-shadow: inset 3px 0 0 ${c.amber};
  }

  ${mq.hover} {
    a:hover {
      color: ${c.cream};
      background: rgba(243, 232, 214, 0.06);
    }
  }
`;

const Badge = styled.span`
  margin-left: auto;
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  border-radius: 5px;
  background: ${c.amber};
  color: ${c.ink};
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

const SideFoot = styled.div`
  display: none;

  ${mq.lg} {
    display: grid;
    gap: 2px;
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid rgba(243, 232, 214, 0.1);
  }

  a,
  button {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 0 12px;
    border: 0;
    border-radius: ${radius.md};
    background: none;
    color: ${c.creamMuted};
    font-size: 0.9rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: color 160ms ease, background-color 160ms ease;
  }

  svg {
    width: 17px;
    height: 17px;
  }

  ${mq.hover} {
    a:hover,
    button:hover {
      color: ${c.cream};
      background: rgba(243, 232, 214, 0.06);
    }
  }

  small {
    padding: 8px 12px 0;
    color: rgba(243, 232, 214, 0.45);
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Main = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Topbar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  padding: 14px 24px;
  background: ${c.paper};
  border-bottom: 1px solid ${c.line};

  h1 {
    font-size: 1.625rem;
    margin-right: auto;
  }
`;

const TopActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const ModeBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 4px 12px;
  border: 1px solid ${c.lineStrong};
  border-radius: ${radius.md};
  background: ${c.surface};

  > span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 0.9375rem;
    white-space: nowrap;
  }

  i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${c.muted};
  }
  &[data-open='true'] i {
    background: ${c.green};
    box-shadow: 0 0 0 3px rgba(42, 111, 65, 0.18);
  }
  &[data-open='false'] i {
    background: ${c.red};
    box-shadow: 0 0 0 3px rgba(184, 50, 32, 0.15);
  }
`;

const ModeButtons = styled.div`
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: ${radius.sm};
  background: ${c.paper2};

  button {
    min-height: 34px;
    padding: 0 10px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: ${c.muted};
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      transform 140ms ${ease.out};
  }

  button[aria-checked='true'] {
    background: ${c.ink};
    color: ${c.paper};
  }

  button:active:not(:disabled) {
    transform: scale(0.96);
  }
`;

const Conn = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: ${radius.md};
  background: ${c.greenSoft};
  color: ${c.green};
  font-size: 0.875rem;
  font-weight: 600;

  svg {
    width: 17px;
    height: 17px;
  }

  &[data-state='off'] {
    background: ${c.redSoft};
    color: ${c.red};
  }
`;

/* Cartão flutuante fora do fluxo: aparecer ou sumir não desloca o conteúdo sob o cursor. */
const Gate = styled.div`
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: min(440px, calc(100vw - 48px));
  padding: 14px 16px;
  border-radius: ${radius.lg};
  background: ${c.ink};
  color: ${c.cream};
  box-shadow: 0 18px 44px -18px rgba(23, 17, 13, 0.65);
  animation: bb-gate-in 320ms ${ease.out} both;

  svg {
    width: 20px;
    height: 20px;
    color: ${c.amber};
  }

  p {
    flex: 1;
    min-width: 220px;
    font-size: 0.9375rem;
  }

  @keyframes bb-gate-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
`;

const Warn = styled.div`
  display: flex;
  gap: 12px;
  margin: 16px 24px 0;
  padding: 14px 16px;
  border-radius: ${radius.md};
  background: ${c.amberSoft};
  color: ${c.ink};
  font-size: 0.9375rem;

  > svg {
    flex: none;
    width: 20px;
    height: 20px;
    color: ${c.amberInk};
    margin-top: 2px;
  }

  div {
    display: grid;
    gap: 6px;
    justify-items: start;
  }

  ul {
    margin: 0;
    padding-left: 18px;
  }
`;

const Content = styled.main`
  flex: 1;
  padding: 20px 24px 40px;
  min-width: 0;
`;
