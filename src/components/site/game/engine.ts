/**
 * Motor do jogo "Monte o SR Burguer": ingredientes caem, a pessoa move o pão de baixo para pegá-los
 * e fecha o lanche com o pão de cima. Carne queimada tira uma vida; deixar o pão cair também.
 * Lógica pura (sem DOM): o componente chama `step` a cada quadro e desenha o resultado.
 */

export type Kind = 'pao' | 'carne' | 'queijo' | 'alface' | 'tomate' | 'bacon' | 'cebola' | 'queimado';

/** A carne aparece em dobro: é a base de qualquer lanche. */
const INGREDIENTS: readonly Kind[] = ['carne', 'carne', 'queijo', 'alface', 'tomate', 'bacon', 'cebola'];

export interface Falling {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  vy: number;
  w: number;
  h: number;
  angle: number;
  spin: number;
}

export interface Pop {
  x: number;
  y: number;
  text: string;
  tone: 'good' | 'bad';
  age: number;
}

export interface World {
  width: number;
  height: number;
  playerX: number;
  /** Alvo do dedo ou do mouse; null quando o teclado está no comando. */
  targetX: number | null;
  vx: number;
  left: boolean;
  right: boolean;
  items: Falling[];
  stack: Kind[];
  pops: Pop[];
  spawnIn: number;
  elapsed: number;
  nextId: number;
  score: number;
  lives: number;
  burgers: number;
  combo: number;
  sinceBun: number;
  /** Tempo restante do brilho vermelho depois de pegar carne queimada (ms). */
  flash: number;
  over: boolean;
}

export type GameEvent =
  | { type: 'catch'; kind: Kind; points: number }
  | { type: 'burger'; points: number }
  | { type: 'burnt' }
  | { type: 'drop-bun' }
  | { type: 'miss' }
  | { type: 'over' };

export const PLATE_W = 92;
export const PLATE_H = 16;
export const LAYER_H = 7;
export const FLOOR_H = 18;
export const MAX_LAYERS = 7;
export const START_LIVES = 3;
const POP_MS = 750;
const FLASH_MS = 320;

const SIZES: Record<Kind, { w: number; h: number }> = {
  pao: { w: 62, h: 30 },
  carne: { w: 56, h: 16 },
  queijo: { w: 52, h: 14 },
  alface: { w: 58, h: 14 },
  tomate: { w: 50, h: 13 },
  bacon: { w: 58, h: 12 },
  cebola: { w: 46, h: 13 },
  queimado: { w: 56, h: 16 },
};

export function sizeOf(kind: Kind): { w: number; h: number } {
  return SIZES[kind];
}

export function createWorld(width: number, height: number): World {
  return {
    width,
    height,
    playerX: width / 2,
    targetX: null,
    vx: 0,
    left: false,
    right: false,
    items: [],
    stack: [],
    pops: [],
    spawnIn: 650,
    elapsed: 0,
    nextId: 1,
    score: 0,
    lives: START_LIVES,
    burgers: 0,
    combo: 0,
    sinceBun: 0,
    flash: 0,
    over: false,
  };
}

/** Linha onde o ingrediente encosta: topo da pilha sobre o pão de baixo. */
export function catchLine(world: World): number {
  return world.height - FLOOR_H - PLATE_H - world.stack.length * LAYER_H;
}

/** A cada 5 acertos seguidos o multiplicador sobe, até 3x. */
export function multiplier(combo: number): number {
  return Math.min(3, 1 + Math.floor(combo / 5));
}

const seconds = (world: World) => world.elapsed / 1000;
const fallSpeed = (world: World) => Math.min(330, 125 + seconds(world) * 2.4);
const spawnEvery = (world: World) => Math.max(400, 1000 - seconds(world) * 7);
const burntChance = (world: World) => Math.min(0.3, 0.12 + seconds(world) * 0.0016);

function pickKind(world: World, rand: () => number): Kind {
  if (world.sinceBun >= 7 || (world.sinceBun >= 4 && rand() < 0.35)) {
    world.sinceBun = 0;
    return 'pao';
  }
  if (rand() < burntChance(world)) return 'queimado';
  world.sinceBun += 1;
  return INGREDIENTS[Math.floor(rand() * INGREDIENTS.length)] ?? 'carne';
}

function spawn(world: World, rand: () => number): void {
  const kind = pickKind(world, rand);
  const { w, h } = SIZES[kind];
  const margin = Math.max(w / 2 + 6, 24);
  world.items.push({
    id: world.nextId++,
    kind,
    x: margin + rand() * Math.max(0, world.width - margin * 2),
    y: -h,
    vy: fallSpeed(world) * (0.88 + rand() * 0.24),
    w,
    h,
    angle: (rand() - 0.5) * 0.5,
    spin: (rand() - 0.5) * 1.6,
  });
}

function pop(world: World, x: number, y: number, text: string, tone: Pop['tone']): void {
  world.pops.push({ x, y, text, tone, age: 0 });
}

function movePlayer(world: World, dt: number): void {
  const half = PLATE_W / 2;
  if (world.left || world.right) {
    world.targetX = null;
    const dir = (world.right ? 1 : 0) - (world.left ? 1 : 0);
    world.vx += (dir * 560 - world.vx) * Math.min(1, dt * 10);
  } else {
    world.vx *= Math.max(0, 1 - dt * 12);
  }
  if (world.targetX !== null) world.playerX += (world.targetX - world.playerX) * Math.min(1, dt * 16);
  else world.playerX += world.vx * dt;
  world.playerX = Math.min(world.width - half, Math.max(half, world.playerX));
}

function onCatch(world: World, item: Falling, events: GameEvent[]): void {
  const y = catchLine(world) - 8;
  if (item.kind === 'queimado') {
    world.lives -= 1;
    world.combo = 0;
    world.flash = FLASH_MS;
    pop(world, item.x, y, 'Queimou', 'bad');
    events.push({ type: 'burnt' });
    return;
  }
  const mult = multiplier(world.combo);
  world.combo += 1;
  if (item.kind === 'pao') {
    if (world.stack.length >= 2) {
      const points = (40 + world.stack.length * 10) * mult;
      world.score += points;
      world.burgers += 1;
      world.stack = [];
      pop(world, item.x, y, `+${points}`, 'good');
      events.push({ type: 'burger', points });
    } else {
      world.score += 5;
      pop(world, item.x, y, '+5', 'good');
      events.push({ type: 'catch', kind: item.kind, points: 5 });
    }
    return;
  }
  const points = 10 * mult;
  world.score += points;
  if (world.stack.length < MAX_LAYERS) world.stack.push(item.kind);
  pop(world, item.x, y, `+${points}`, 'good');
  events.push({ type: 'catch', kind: item.kind, points });
}

function onMiss(world: World, item: Falling, events: GameEvent[]): void {
  if (item.kind === 'queimado') return;
  world.combo = 0;
  if (item.kind === 'pao') {
    world.lives -= 1;
    pop(world, item.x, world.height - FLOOR_H - 10, 'O pão caiu', 'bad');
    events.push({ type: 'drop-bun' });
  } else {
    events.push({ type: 'miss' });
  }
}

/** Avança o jogo `dtMs` milissegundos e devolve o que aconteceu (para som, vibração e placar). */
export function step(world: World, dtMs: number, rand: () => number = Math.random): GameEvent[] {
  const events: GameEvent[] = [];
  if (world.over) return events;
  const dt = Math.min(dtMs, 50) / 1000;
  world.elapsed += dt * 1000;

  movePlayer(world, dt);

  world.spawnIn -= dt * 1000;
  if (world.spawnIn <= 0) {
    spawn(world, rand);
    world.spawnIn = spawnEvery(world);
  }

  const remaining: Falling[] = [];
  for (const item of world.items) {
    const line = catchLine(world);
    const before = item.y + item.h / 2;
    item.y += item.vy * dt;
    item.angle += item.spin * dt;
    const after = item.y + item.h / 2;
    const reach = PLATE_W / 2 + item.w * 0.35;
    if (before <= line && after >= line && Math.abs(item.x - world.playerX) <= reach) {
      onCatch(world, item, events);
    } else if (item.y - item.h / 2 > world.height) {
      onMiss(world, item, events);
    } else {
      remaining.push(item);
    }
  }
  world.items = remaining;

  for (const p of world.pops) p.age += dt * 1000;
  world.pops = world.pops.filter((p) => p.age < POP_MS);
  world.flash = Math.max(0, world.flash - dt * 1000);

  if (world.lives <= 0) {
    world.lives = 0;
    world.over = true;
    events.push({ type: 'over' });
  }
  return events;
}

/** Mantém o jogo coerente quando a área muda de tamanho (giro do celular, janela). */
export function resizeWorld(world: World, width: number, height: number): void {
  const ratio = width / (world.width || width);
  world.width = width;
  world.height = height;
  world.playerX = Math.min(width - PLATE_W / 2, Math.max(PLATE_W / 2, world.playerX * ratio));
  if (world.targetX !== null) world.targetX *= ratio;
  for (const item of world.items) item.x *= ratio;
}
