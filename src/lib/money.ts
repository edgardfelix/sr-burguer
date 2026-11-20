import type { Cents } from './types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 4290 -> "R$ 42,90" (com espaço comum, não o NBSP do Intl, para texto do WhatsApp). */
export function formatBRL(cents: Cents): string {
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/** Converte "42,90", "R$ 42,90", "42.90" ou "42" em centavos. Retorna null se inválido. */
export function parseBRL(input: string): Cents | null {
  const cleaned = input.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Valor em centavos para o campo de edição: 4290 -> "42,90". */
export function centsToInput(cents: Cents | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}
