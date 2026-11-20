'use client';

interface IdleOptions {
  /** Prazo máximo para rodar mesmo sem ociosidade (ms). */
  timeout?: number;
  /** Espera o evento load da página antes de agendar. */
  afterLoad?: boolean;
}

/**
 * Agenda trabalho não essencial (baixar código, abrir conexões) para depois do carregamento,
 * no tempo ocioso do navegador. Assim nada disputa rede ou processador com a primeira pintura.
 * Devolve a função que cancela o agendamento.
 */
export function whenIdle(task: () => void, { timeout = 2500, afterLoad = true }: IdleOptions = {}): () => void {
  let cancelled = false;
  let idleId = 0;
  let timer = 0;

  const run = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => !cancelled && task(), { timeout });
    } else {
      timer = window.setTimeout(() => !cancelled && task(), 250);
    }
  };

  const onLoad = () => run();
  if (!afterLoad || document.readyState === 'complete') run();
  else window.addEventListener('load', onLoad, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener('load', onLoad);
    if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
    window.clearTimeout(timer);
  };
}
