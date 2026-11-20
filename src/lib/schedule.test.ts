import { describe, expect, it } from 'vitest';
import {
  businessDateOf,
  computeStoreStatus,
  describeStatus,
  formatClock,
  shiftDate,
  summarizeHours,
  zonedParts,
  zonedToEpoch,
} from './schedule';
import type { WeekHours } from './types';

/** Horário de São Paulo (UTC-3) para epoch ms. */
const sp = (y: number, m: number, d: number, h: number, min = 0) => Date.UTC(y, m - 1, d, h + 3, min);

/** Horário de referência dos testes (terça a domingo, 16:00 às 23:00), independente do horário cadastrado da loja. */
const day = (enabled: boolean) => ({ enabled, open: '16:00', close: '23:00' });
const defaults = { hours: { 0: day(true), 1: day(false), 2: day(true), 3: day(true), 4: day(true), 5: day(true), 6: day(true) } as WeekHours };
const auto = { hours: defaults.hours, mode: 'auto' as const };

describe('fuso horário', () => {
  it('converte relógio de São Paulo para epoch', () => {
    expect(zonedToEpoch(2026, 11, 15, 20, 0)).toBe(Date.UTC(2026, 10, 15, 23, 0));
  });

  it('lê dia da semana e hora em São Paulo', () => {
    const p = zonedParts(sp(2026, 11, 15, 20, 30));
    expect(p).toMatchObject({ year: 2026, month: 11, day: 15, weekday: 0, hour: 20, minute: 30 });
  });
});

describe('computeStoreStatus (terça a domingo, 16:00 às 23:00)', () => {
  it('domingo 20:00 está aberto e fecha às 23:00', () => {
    const status = computeStoreStatus(auto, sp(2026, 11, 15, 20));
    expect(status.isOpen).toBe(true);
    expect(status.closesAt).toBe(sp(2026, 11, 15, 23));
  });

  it('domingo 23:30 está fechado e abre na terça (segunda não abre)', () => {
    const status = computeStoreStatus(auto, sp(2026, 11, 15, 23, 30));
    expect(status.isOpen).toBe(false);
    expect(status.nextOpenAt).toBe(sp(2026, 11, 17, 16));
  });

  it('segunda ao meio-dia está fechado', () => {
    expect(computeStoreStatus(auto, sp(2026, 11, 16, 12)).isOpen).toBe(false);
  });

  it('abertura é inclusiva e fechamento exclusivo', () => {
    expect(computeStoreStatus(auto, sp(2026, 11, 17, 15, 59)).isOpen).toBe(false);
    expect(computeStoreStatus(auto, sp(2026, 11, 17, 16, 0)).isOpen).toBe(true);
    expect(computeStoreStatus(auto, sp(2026, 11, 17, 23, 0)).isOpen).toBe(false);
  });

  it('expediente que passa da meia-noite continua aberto na madrugada', () => {
    const hours: WeekHours = { ...defaults.hours, 5: { enabled: true, open: '18:00', close: '02:00' } };
    const sabado0130 = computeStoreStatus({ hours, mode: 'auto' }, sp(2026, 11, 21, 1, 30));
    expect(sabado0130.isOpen).toBe(true);
    expect(sabado0130.closesAt).toBe(sp(2026, 11, 21, 2));
    expect(computeStoreStatus({ hours, mode: 'auto' }, sp(2026, 11, 21, 2, 30)).isOpen).toBe(false);
    const sexta2200 = computeStoreStatus({ hours, mode: 'auto' }, sp(2026, 11, 20, 22));
    expect(sexta2200.closesAt).toBe(sp(2026, 11, 21, 2));
  });

  it('interruptor manual vence o horário', () => {
    expect(computeStoreStatus({ ...auto, mode: 'open' }, sp(2026, 11, 16, 12))).toMatchObject({ isOpen: true, source: 'manual' });
    expect(computeStoreStatus({ ...auto, mode: 'closed' }, sp(2026, 11, 15, 20))).toMatchObject({ isOpen: false, source: 'manual' });
  });

  it('sem nenhum dia habilitado não há próxima abertura', () => {
    const hours = Object.fromEntries(Object.entries(defaults.hours).map(([k, v]) => [k, { ...v, enabled: false }])) as unknown as WeekHours;
    expect(computeStoreStatus({ hours, mode: 'auto' }, sp(2026, 11, 15, 20)).nextOpenAt).toBeNull();
  });
});

describe('describeStatus', () => {
  it('descreve abertura de hoje, amanhã e de outro dia', () => {
    const terca1500 = sp(2026, 11, 17, 15);
    expect(describeStatus(computeStoreStatus(auto, terca1500), terca1500).detail).toBe('Abre hoje às 16:00');
    const terca2330 = sp(2026, 11, 17, 23, 30);
    expect(describeStatus(computeStoreStatus(auto, terca2330), terca2330).detail).toBe('Abre amanhã às 16:00');
    const domingo2330 = sp(2026, 11, 15, 23, 30);
    expect(describeStatus(computeStoreStatus(auto, domingo2330), domingo2330).detail).toBe('Abre terça às 16:00');
  });

  it('descreve aberto com horário de fechamento', () => {
    const now = sp(2026, 11, 15, 20);
    expect(describeStatus(computeStoreStatus(auto, now), now)).toEqual({ title: 'Aberto agora', detail: 'Fecha às 23:00' });
  });
});

describe('data de negócio', () => {
  it('pedidos antes das 04:00 contam para o dia anterior', () => {
    expect(businessDateOf(sp(2026, 11, 16, 2))).toBe('2026-11-15');
    expect(businessDateOf(sp(2026, 11, 16, 4))).toBe('2026-11-16');
  });

  it('desloca datas', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('summarizeHours', () => {
  it('agrupa dias consecutivos com o mesmo horário', () => {
    expect(summarizeHours(defaults.hours)).toEqual(['Terça a domingo, das 16:00 às 23:00']);
  });

  it('separa horários diferentes', () => {
    const hours: WeekHours = { ...defaults.hours, 6: { enabled: true, open: '12:00', close: '23:00' } };
    expect(summarizeHours(hours)).toEqual([
      'Terça a sexta, das 16:00 às 23:00',
      'Sábado, das 12:00 às 23:00',
      'Domingo, das 16:00 às 23:00',
    ]);
  });

  it('formata relógio', () => {
    expect(formatClock(sp(2026, 11, 15, 9, 5))).toBe('09:05');
  });
});
