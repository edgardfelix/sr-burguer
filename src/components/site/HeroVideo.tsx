'use client';

import { Play } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useHydrated, useMediaQuery } from '@/client/hooks';
import { whenIdle } from '@/client/idle';
import { VideoToggle } from './hero-video-styles';

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
type NavigatorWithConnection = Navigator & { connection?: Connection };

const SLOW_NETWORKS = new Set(['slow-2g', '2g', '3g']);

function subscribeConnection(listener: () => void) {
  const connection = (navigator as NavigatorWithConnection).connection;
  connection?.addEventListener?.('change', listener);
  return () => connection?.removeEventListener?.('change', listener);
}

/** Economia de dados ligada ou rede lenta: o vídeo só toca se a pessoa pedir. */
function useConstrainedNetwork(): boolean {
  return useSyncExternalStore(
    subscribeConnection,
    () => {
      const connection = (navigator as NavigatorWithConnection).connection;
      return connection?.saveData === true || SLOW_NETWORKS.has(connection?.effectiveType ?? '');
    },
    () => false,
  );
}

/** Player carregado sob demanda: fica fora do pacote inicial e não disputa banda com o pôster (LCP). */
const HeroVideoPlayer = dynamic(() => import('./HeroVideoPlayer'), { ssr: false });

/**
 * Camada de vídeo do hero. O pôster (imagem LCP) vem do servidor no componente Hero;
 * aqui só decidimos quando baixar o vídeo:
 *  - com movimento permitido e rede boa: depois do load, no tempo ocioso do navegador;
 *  - com "reduzir movimento", economia de dados ou rede lenta: só quando a pessoa tocar em reproduzir.
 */
export function HeroVideo() {
  const hydrated = useHydrated();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const constrained = useConstrainedNetwork();
  const autoplay = hydrated && !reduceMotion && !constrained;
  const [idle, setIdle] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!autoplay) return;
    return whenIdle(() => setIdle(true), { timeout: 3000 });
  }, [autoplay]);

  if (requested || (autoplay && idle)) return <HeroVideoPlayer startPlaying />;
  if (!hydrated || autoplay) return null;

  return (
    <VideoToggle type="button" onClick={() => setRequested(true)} aria-label="Reproduzir vídeo">
      <Play aria-hidden />
    </VideoToggle>
  );
}
