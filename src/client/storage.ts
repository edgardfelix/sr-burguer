'use client';

import { useSyncExternalStore } from 'react';
import type { StateStorage } from 'zustand/middleware';

const serverStorage: StateStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };

/**
 * Armazenamento dos stores persistidos: localStorage no navegador e um vazio na renderização do servidor
 * (sem tocar no localStorage global, que o Node 22+ expõe com aviso).
 */
export const persistStorage = (): StateStorage => (typeof window === 'undefined' ? serverStorage : window.localStorage);

/** localStorage pode falhar (aba anônima, cota, bloqueio): toda leitura e escrita é protegida. */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignorado: preferência só deste aparelho */
  }
  storageListeners.forEach((listener) => listener());
}

const storageListeners = new Set<() => void>();

function subscribeStorage(listener: () => void) {
  storageListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    storageListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** Valor bruto do localStorage como fonte externa (sem setState em efeito, sem divergência na hidratação). */
export function useStorageValue(key: string, serverValue: string | null): string | null {
  return useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => serverValue,
  );
}

export const STORAGE_KEYS = {
  cart: 'srburguer-carrinho',
  customer: 'srburguer-cliente',
  sound: 'srburguer-som',
  cookies: 'srburguer-aviso-cookies',
  adminSound: 'srburguer-painel-som',
  lastOrder: 'srburguer-ultimo-pedido',
  gameBest: 'srburguer-jogo-recorde',
} as const;
