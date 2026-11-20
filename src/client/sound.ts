'use client';

/**
 * Sons de interface sintetizados com Web Audio (sem arquivos para baixar).
 * Curtos e baixos no site; o alerta de pedido novo do painel é mais forte e mais longo.
 * Navegadores só liberam áudio após um gesto do usuário: chame unlockAudio() em um clique.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
const audioListeners = new Set<() => void>();

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    context.onstatechange = () => audioListeners.forEach((listener) => listener());
  }
  return context;
}

/** Estado do áudio como fonte externa (para useSyncExternalStore). */
export function subscribeAudioState(listener: () => void): () => void {
  audioListeners.add(listener);
  return () => audioListeners.delete(listener);
}

export function getAudioState(): 'running' | 'locked' {
  return context?.state === 'running' ? 'running' : 'locked';
}

export async function unlockAudio(): Promise<boolean> {
  const ctx = getContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  audioListeners.forEach((listener) => listener());
  return ctx.state === 'running';
}

export function isAudioRunning(): boolean {
  return context?.state === 'running';
}

interface Tone {
  freq: number;
  at?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  to?: number;
}

function tone(ctx: AudioContext, start: number, { freq, at = 0, duration, type = 'sine', gain = 0.05, to }: Tone) {
  const t = start + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.03);
}

function play(tones: Tone[]) {
  const ctx = getContext();
  if (!ctx) return;
  const run = () => {
    const start = ctx.currentTime + 0.005;
    for (const t of tones) tone(ctx, start, t);
  };
  if (ctx.state === 'suspended') ctx.resume().then(run).catch(() => undefined);
  else run();
}

export const sfx = {
  /** Item adicionado: "pop" curto subindo. */
  add: () => play([{ freq: 640, to: 980, duration: 0.09, type: 'triangle', gain: 0.045 }]),
  /** Item removido: tom curto descendo. */
  remove: () => play([{ freq: 520, to: 340, duration: 0.08, type: 'triangle', gain: 0.035 }]),
  /** Toque leve em controles. */
  tick: () => play([{ freq: 1250, duration: 0.028, gain: 0.018 }]),
  /** Pedido enviado: acorde maior arpejado. */
  success: () =>
    play([
      { freq: 523.25, duration: 0.18, type: 'triangle', gain: 0.05 },
      { freq: 659.25, at: 0.09, duration: 0.2, type: 'triangle', gain: 0.05 },
      { freq: 783.99, at: 0.18, duration: 0.42, type: 'triangle', gain: 0.055 },
    ]),
  error: () =>
    play([
      { freq: 233, duration: 0.12, type: 'triangle', gain: 0.045 },
      { freq: 196, at: 0.11, duration: 0.18, type: 'triangle', gain: 0.045 },
    ]),
  /** Alerta de pedido novo no painel: campainha de três notas, audível na cozinha. */
  newOrder: () =>
    play([
      { freq: 1318.5, duration: 0.5, gain: 0.22 },
      { freq: 2637, duration: 0.25, gain: 0.04 },
      { freq: 1046.5, at: 0.22, duration: 0.55, gain: 0.22 },
      { freq: 2093, at: 0.22, duration: 0.25, gain: 0.04 },
      { freq: 1568, at: 0.44, duration: 0.9, gain: 0.24 },
      { freq: 3136, at: 0.44, duration: 0.3, gain: 0.04 },
    ]),
};

export function haptic(pattern: number | number[] = 8): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* sem suporte */
    }
  }
}
