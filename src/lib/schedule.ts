import type { StoreMode, StoreStatus, Weekday, WeekHours } from './types';

/** A loja opera no horário de Brasília (São Paulo). */
export const TIME_ZONE = 'America/Sao_Paulo';

/** O "dia de negócio" vira às 04:00: pedidos da madrugada contam para o expediente anterior. */
export const BUSINESS_DAY_CUTOFF_HOURS = 4;

const DAY_MS = 86_400_000;

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terça',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sábado',
};

/** Ordem de exibição: segunda a domingo. */
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  weekday: Weekday;
  hour: number;
  minute: number;
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

const WEEKDAY_INDEX: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function zonedParts(epochMs: number): ZonedParts {
  const map: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(new Date(epochMs))) map[part.type] = part.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: WEEKDAY_INDEX[map.weekday ?? 'Sun'] ?? 0,
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
  };
}

/** Diferença (ms) entre o relógio de São Paulo e o UTC no instante dado. */
function offsetAt(epochMs: number): number {
  const p = zonedParts(epochMs);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const truncated = Math.floor(epochMs / 60_000) * 60_000;
  return asUtc - truncated;
}

/** Converte data e hora "de parede" em São Paulo para epoch ms. */
export function zonedToEpoch(year: number, month: number, day: number, hour: number, minute: number): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetAt(guess);
  const second = guess - offsetAt(first);
  return second;
}

export function parseHHMM(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return Number.NaN;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return Number.NaN;
  return h * 60 + m;
}

/** Epoch ms do horário "HH:MM" no dia (de calendário de SP) deslocado `dayOffset` dias de `ref`. */
function atDayTime(ref: ZonedParts, dayOffset: number, minutes: number): number {
  const base = Date.UTC(ref.year, ref.month - 1, ref.day) + dayOffset * DAY_MS;
  const d = new Date(base);
  return zonedToEpoch(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), Math.floor(minutes / 60), minutes % 60);
}

function shiftWeekday(w: Weekday, delta: number): Weekday {
  return ((((w + delta) % 7) + 7) % 7) as Weekday;
}

export function computeStoreStatus(input: { hours: WeekHours; mode: StoreMode }, now: number): StoreStatus {
  if (input.mode === 'open') return { isOpen: true, source: 'manual', closesAt: null, nextOpenAt: null };
  if (input.mode === 'closed') return { isOpen: false, source: 'manual', closesAt: null, nextOpenAt: null };

  const today = zonedParts(now);
  const nowMinutes = today.hour * 60 + today.minute;

  // Expediente de ontem que atravessou a meia-noite.
  const yesterday = input.hours[shiftWeekday(today.weekday, -1)];
  if (yesterday?.enabled) {
    const open = parseHHMM(yesterday.open);
    const close = parseHHMM(yesterday.close);
    if (close < open && nowMinutes < close) {
      return { isOpen: true, source: 'schedule', closesAt: atDayTime(today, 0, close), nextOpenAt: null };
    }
  }

  const current = input.hours[today.weekday];
  if (current?.enabled) {
    const open = parseHHMM(current.open);
    const close = parseHHMM(current.close);
    if (open < close && nowMinutes >= open && nowMinutes < close) {
      return { isOpen: true, source: 'schedule', closesAt: atDayTime(today, 0, close), nextOpenAt: null };
    }
    if (close < open && nowMinutes >= open) {
      return { isOpen: true, source: 'schedule', closesAt: atDayTime(today, 1, close), nextOpenAt: null };
    }
  }

  return { isOpen: false, source: 'schedule', closesAt: null, nextOpenAt: findNextOpening(input.hours, today, now) };
}

function findNextOpening(hours: WeekHours, today: ZonedParts, now: number): number | null {
  for (let offset = 0; offset <= 7; offset++) {
    const day = hours[shiftWeekday(today.weekday, offset)];
    if (!day?.enabled) continue;
    const open = parseHHMM(day.open);
    const close = parseHHMM(day.close);
    if (Number.isNaN(open) || Number.isNaN(close) || open === close) continue;
    const candidate = atDayTime(today, offset, open);
    if (candidate > now) return candidate;
  }
  return null;
}

/** "AAAA-MM-DD" do expediente ao qual o instante pertence. */
export function businessDateOf(now: number): string {
  const p = zonedParts(now - BUSINESS_DAY_CUTOFF_HOURS * 3_600_000);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Subtrai dias de uma data "AAAA-MM-DD". */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) + days * DAY_MS);
  return t.toISOString().slice(0, 10);
}

export function formatClock(epochMs: number): string {
  const p = zonedParts(epochMs);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Texto curto do status, ex.: "Aberto agora, fecha às 23:00". */
export function describeStatus(status: StoreStatus, now: number): { title: string; detail: string } {
  if (status.isOpen) {
    return {
      title: 'Aberto agora',
      detail: status.closesAt ? `Fecha às ${formatClock(status.closesAt)}` : 'Recebendo pedidos',
    };
  }
  if (status.source === 'manual' || !status.nextOpenAt) {
    return { title: 'Fechado no momento', detail: 'Pedidos pausados pela loja' };
  }
  const next = zonedParts(status.nextOpenAt);
  const today = zonedParts(now);
  const tomorrow = zonedParts(now + DAY_MS);
  const clock = formatClock(status.nextOpenAt);
  let when: string;
  if (next.day === today.day && next.month === today.month) when = `hoje às ${clock}`;
  else if (next.day === tomorrow.day && next.month === tomorrow.month) when = `amanhã às ${clock}`;
  else when = `${WEEKDAY_NAMES[next.weekday]} às ${clock}`;
  return { title: 'Fechado agora', detail: `Abre ${when}` };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Agrupa dias com o mesmo horário: "Terça a domingo, das 16:00 às 23:00". */
export function summarizeHours(hours: WeekHours): string[] {
  const groups: { days: Weekday[]; open: string; close: string }[] = [];
  for (const day of WEEK_ORDER) {
    const h = hours[day];
    if (!h?.enabled) continue;
    const last = groups[groups.length - 1];
    const lastDay = last?.days[last.days.length - 1];
    const consecutive = last && lastDay !== undefined && WEEK_ORDER.indexOf(day) === WEEK_ORDER.indexOf(lastDay) + 1;
    if (last && consecutive && last.open === h.open && last.close === h.close) last.days.push(day);
    else groups.push({ days: [day], open: h.open, close: h.close });
  }
  return groups.map(({ days, open, close }) => {
    const first = WEEKDAY_NAMES[days[0] as Weekday];
    const lastName = WEEKDAY_NAMES[days[days.length - 1] as Weekday];
    const label = days.length === 1 ? first : days.length === 2 ? `${first} e ${lastName}` : `${first} a ${lastName}`;
    return `${capitalize(label)}, das ${open} às ${close}`;
  });
}
