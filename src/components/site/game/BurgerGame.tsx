'use client';

import { Heart, Pause, Play, RotateCcw, Trophy } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import styled from 'styled-components';
import { haptic, sfx } from '@/client/sound';
import { readStorage, STORAGE_KEYS, useStorageValue, writeStorage } from '@/client/storage';
import { c, font, mq, radius } from '@/styles/tokens';
import { Button, IconButton } from '../../ui/Button';
import { useSound } from '../SoundToggle';
import { drawWorld } from './draw';
import { createWorld, resizeWorld, START_LIVES, step, type GameEvent, type World } from './engine';

type Phase = 'idle' | 'playing' | 'paused' | 'over';

interface Hud {
  score: number;
  lives: number;
  burgers: number;
}

const INITIAL_HUD: Hud = { score: 0, lives: START_LIVES, burgers: 0 };
const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);

/**
 * "Monte o SR Burguer": minijogo da tela de acompanhamento, carregado só quando a pessoa abre a aba.
 * Canvas 2D com requestAnimationFrame; pausa sozinho fora da aba do jogo ou com a aba do navegador escondida.
 */
export default function BurgerGame({ active }: { active: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const fontRef = useRef('system-ui, sans-serif');
  const [phase, setPhase] = useState<Phase>('idle');
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [record, setRecord] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const bestRaw = useStorageValue(STORAGE_KEYS.gameBest, null);
  const best = Number(bestRaw ?? 0) || 0;
  const { enabled: soundOn } = useSound();

  // Saiu da aba do jogo no meio da partida: pausa (estado derivado, sem efeito).
  if (!active && phase === 'playing') setPhase('paused');

  // Tamanho do canvas acompanha a área (nitidez em telas de alta densidade, até 2x).
  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    fontRef.current = getComputedStyle(document.body).fontFamily || fontRef.current;
    const observer = new ResizeObserver(() => {
      const rect = frame.getBoundingClientRect();
      const w = Math.max(220, Math.round(rect.width));
      const h = Math.max(240, Math.round(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (worldRef.current) resizeWorld(worldRef.current, w, h);
      else worldRef.current = createWorld(w, h);
      setSize({ w, h });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Fora da partida, desenha um quadro parado (início mostra um lanche montado).
  useEffect(() => {
    if (phase === 'playing' || !size.w) return;
    const ctx = canvasRef.current?.getContext('2d');
    const world = worldRef.current;
    if (ctx && world) drawWorld(ctx, world, fontRef.current, phase === 'idle');
  }, [phase, size]);

  const onEvents = useEffectEvent((events: GameEvent[], world: World) => {
    for (const event of events) {
      if (event.type === 'catch') {
        if (soundOn) sfx.add();
      } else if (event.type === 'burger') {
        if (soundOn) sfx.success();
        haptic(12);
      } else if (event.type === 'burnt') {
        if (soundOn) sfx.error();
        haptic([25, 40, 25]);
      } else if (event.type === 'drop-bun') {
        if (soundOn) sfx.remove();
        haptic(20);
      }
    }
    if (events.some((e) => e.type !== 'miss')) setHud({ score: world.score, lives: world.lives, burgers: world.burgers });
  });

  const onGameOver = useEffectEvent((world: World) => {
    const previous = Number(readStorage<number>(STORAGE_KEYS.gameBest, 0)) || 0;
    const isRecord = world.score > previous;
    if (isRecord) writeStorage(STORAGE_KEYS.gameBest, world.score);
    setRecord(isRecord);
    setHud({ score: world.score, lives: 0, burgers: world.burgers });
    setPhase('over');
  });

  // Laço do jogo: só roda durante a partida.
  useEffect(() => {
    if (phase !== 'playing') return;
    const ctx = canvasRef.current?.getContext('2d');
    const world = worldRef.current;
    if (!ctx || !world) return;
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const events = step(world, t - last);
      last = t;
      if (events.length) onEvents(events, world);
      drawWorld(ctx, world, fontRef.current);
      if (world.over) {
        onGameOver(world);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') setPhase('paused');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase]);

  const start = () => {
    const rect = frameRef.current?.getBoundingClientRect();
    worldRef.current = createWorld(Math.max(220, Math.round(rect?.width ?? 320)), Math.max(240, Math.round(rect?.height ?? 360)));
    setHud(INITIAL_HUD);
    setRecord(false);
    setPhase('playing');
    frameRef.current?.focus({ preventScroll: true });
  };

  const resume = () => {
    setPhase('playing');
    frameRef.current?.focus({ preventScroll: true });
  };

  const aim = (event: PointerEvent<HTMLDivElement>) => {
    const world = worldRef.current;
    const frame = frameRef.current;
    if (!world || !frame || phase !== 'playing') return;
    world.targetX = event.clientX - frame.getBoundingClientRect().left;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const world = worldRef.current;
    if (LEFT_KEYS.has(event.key) || RIGHT_KEYS.has(event.key)) {
      event.preventDefault();
      if (world && phase === 'playing') {
        if (LEFT_KEYS.has(event.key)) world.left = true;
        else world.right = true;
      }
      return;
    }
    // Espaço pausa e retoma (só com o foco na área do jogo, para não disparar junto com os botões).
    if (event.key === ' ' && event.target === event.currentTarget) {
      event.preventDefault();
      if (phase === 'playing') setPhase('paused');
      else if (phase === 'paused') resume();
      else start();
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    const world = worldRef.current;
    if (!world) return;
    if (LEFT_KEYS.has(event.key)) world.left = false;
    if (RIGHT_KEYS.has(event.key)) world.right = false;
  };

  const shownBest = Math.max(best, phase === 'over' ? hud.score : 0);

  return (
    <Root>
      <HudBar>
        <Stat>
          <small>Pontos</small>
          <strong>{hud.score}</strong>
        </Stat>
        <Stat>
          <small>Lanches</small>
          <strong>{hud.burgers}</strong>
        </Stat>
        <Lives role="img" aria-label={`${hud.lives} de ${START_LIVES} vidas`}>
          {Array.from({ length: START_LIVES }, (_, i) => (
            <Heart key={i} aria-hidden data-on={i < hud.lives} />
          ))}
        </Lives>
        <Stat data-align="end">
          <small>Recorde</small>
          <strong>{shownBest}</strong>
        </Stat>
        <IconButton
          type="button"
          data-size="sm"
          aria-label={phase === 'playing' ? 'Pausar jogo' : 'Continuar jogo'}
          disabled={phase !== 'playing' && phase !== 'paused'}
          onClick={() => (phase === 'playing' ? setPhase('paused') : resume())}
        >
          {phase === 'playing' ? <Pause aria-hidden /> : <Play aria-hidden />}
        </IconButton>
      </HudBar>

      <Frame
        ref={frameRef}
        tabIndex={0}
        role="group"
        aria-roledescription="jogo"
        aria-label="Monte o SR Burguer"
        aria-describedby="jogo-ajuda"
        data-vaul-no-drag=""
        data-playing={phase === 'playing'}
        onPointerDown={(event) => {
          if (phase !== 'playing') return;
          event.currentTarget.setPointerCapture(event.pointerId);
          aim(event);
        }}
        onPointerMove={(event) => {
          if (event.pointerType === 'mouse' || event.buttons > 0) aim(event);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        {phase !== 'playing' ? (
          <Overlay>
            {phase === 'idle' ? (
              <>
                <h4>Monte o SR Burguer</h4>
                <p>Pegue os ingredientes com o pão e feche o lanche com o pão de cima. Fuja da carne queimada e não deixe o pão cair.</p>
                <small>Arraste o dedo na tela ou use as setas do teclado.</small>
                <Button type="button" data-variant="accent" onClick={start}>
                  <Play aria-hidden /> Começar
                </Button>
              </>
            ) : phase === 'paused' ? (
              <>
                <h4>Jogo pausado</h4>
                <p>
                  {hud.score} pontos até agora. Seu pedido continua sendo acompanhado.
                </p>
                <Actions>
                  <Button type="button" data-variant="accent" onClick={resume}>
                    <Play aria-hidden /> Continuar
                  </Button>
                  <Button type="button" data-variant="light" onClick={start}>
                    <RotateCcw aria-hidden /> Recomeçar
                  </Button>
                </Actions>
              </>
            ) : (
              <>
                <h4>Fim de jogo</h4>
                <p>
                  {hud.score} pontos e {hud.burgers} {hud.burgers === 1 ? 'lanche montado' : 'lanches montados'}.
                </p>
                {record && hud.score > 0 ? (
                  <Record>
                    <Trophy aria-hidden /> Novo recorde neste aparelho
                  </Record>
                ) : null}
                <Button type="button" data-variant="accent" onClick={start}>
                  <RotateCcw aria-hidden /> Jogar de novo
                </Button>
              </>
            )}
          </Overlay>
        ) : null}
      </Frame>
      <p id="jogo-ajuda" className="visually-hidden">
        Use as setas para os lados para mover o pão. A barra de espaço pausa e retoma.
      </p>
      <span className="visually-hidden" role="status" aria-live="polite">
        {phase === 'over' ? `Fim de jogo: ${hud.score} pontos.` : ''}
      </span>
    </Root>
  );
}

const Root = styled.div`
  display: grid;
  gap: 10px;
`;

const HudBar = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Stat = styled.p`
  display: grid;
  gap: 0;
  line-height: 1.1;

  small {
    font-size: 0.75rem;
    font-weight: 600;
    color: ${c.muted};
  }

  strong {
    font-size: 1.125rem;
    font-variant-numeric: tabular-nums;
  }

  &[data-align='end'] {
    margin-left: auto;
    text-align: right;
  }
`;

const Lives = styled.span`
  display: inline-flex;
  gap: 2px;

  svg {
    width: 18px;
    height: 18px;
    color: ${c.lineStrong};
    transition:
      color 200ms ease,
      transform 200ms ease;
  }

  svg[data-on='true'] {
    color: ${c.red};
    fill: currentColor;
  }
`;

const Frame = styled.div`
  position: relative;
  overflow: hidden;
  height: 360px;
  border-radius: ${radius.lg};
  background: ${c.night};
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  outline: none;

  &:focus-visible {
    box-shadow:
      0 0 0 2px ${c.paper},
      0 0 0 4px ${c.focus};
  }

  &[data-playing='true'] {
    cursor: none;
  }

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  ${mq.md} {
    height: 400px;
  }
`;

/* Conteúdo no alto: o lanche de exemplo da tela de início continua visível embaixo, sem ficar atrás do botão. */
const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 10px;
  padding: 28px 24px 24px;
  background: rgba(23, 17, 13, 0.72);
  color: ${c.cream};
  text-align: center;

  > svg {
    width: 30px;
    height: 30px;
    color: ${c.amber};
  }

  h4 {
    font-family: ${font.display};
    font-size: 1.5rem;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  p {
    max-width: 30ch;
    font-size: 0.9375rem;
    line-height: 1.45;
    color: ${c.cream};
  }

  small {
    font-size: 0.8125rem;
    color: ${c.creamMuted};
  }

  button {
    margin-top: 6px;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`;

const Record = styled.p`
  && {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: ${c.amber};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;
