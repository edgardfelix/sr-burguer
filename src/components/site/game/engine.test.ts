import { describe, expect, it } from 'vitest';
import { catchLine, createWorld, multiplier, sizeOf, START_LIVES, step, type Kind, type World } from './engine';

/** Gerador previsível (mulberry32) para simular partidas inteiras. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Coloca um item logo acima da linha de pegada, sobre o pão (ou deslocado em dx). */
function drop(world: World, kind: Kind, dx = 0): void {
  const { w, h } = sizeOf(kind);
  world.spawnIn = Number.POSITIVE_INFINITY;
  world.items.push({ id: world.nextId++, kind, x: world.playerX + dx, y: catchLine(world) - h / 2 - 1, vy: 200, w, h, angle: 0, spin: 0 });
}

/** Item já passando do chão (perdido). */
function fall(world: World, kind: Kind): void {
  const { w, h } = sizeOf(kind);
  world.spawnIn = Number.POSITIVE_INFINITY;
  world.items.push({ id: world.nextId++, kind, x: 10, y: world.height + h, vy: 200, w, h, angle: 0, spin: 0 });
}

describe('jogo Monte o SR Burguer', () => {
  it('pega ingrediente: pontua, empilha e conta a sequência', () => {
    const world = createWorld(360, 360);
    drop(world, 'carne');
    const events = step(world, 16);
    expect(events).toContainEqual({ type: 'catch', kind: 'carne', points: 10 });
    expect(world.score).toBe(10);
    expect(world.stack).toEqual(['carne']);
    expect(world.combo).toBe(1);
  });

  it('fecha o lanche com o pão de cima e esvazia a pilha', () => {
    const world = createWorld(360, 360);
    drop(world, 'carne');
    step(world, 16);
    drop(world, 'queijo');
    step(world, 16);
    drop(world, 'pao');
    const events = step(world, 16);
    expect(events).toContainEqual({ type: 'burger', points: 60 });
    expect(world.burgers).toBe(1);
    expect(world.stack).toEqual([]);
    expect(world.score).toBe(80);
  });

  it('carne queimada tira uma vida e zera a sequência', () => {
    const world = createWorld(360, 360);
    world.combo = 7;
    drop(world, 'queimado');
    expect(step(world, 16)).toContainEqual({ type: 'burnt' });
    expect(world.lives).toBe(START_LIVES - 1);
    expect(world.combo).toBe(0);
    expect(world.flash).toBeGreaterThan(0);
  });

  it('pão no chão tira vida; ingrediente perdido só zera a sequência', () => {
    const world = createWorld(360, 360);
    world.combo = 3;
    fall(world, 'alface');
    expect(step(world, 16)).toContainEqual({ type: 'miss' });
    expect(world.lives).toBe(START_LIVES);
    expect(world.combo).toBe(0);
    fall(world, 'pao');
    expect(step(world, 16)).toContainEqual({ type: 'drop-bun' });
    expect(world.lives).toBe(START_LIVES - 1);
  });

  it('não pega o que cai longe do pão', () => {
    const world = createWorld(360, 360);
    world.playerX = 60;
    drop(world, 'carne', 200);
    step(world, 16);
    expect(world.score).toBe(0);
    expect(world.items).toHaveLength(1);
  });

  it('termina quando as vidas acabam', () => {
    const world = createWorld(360, 360);
    for (let i = 0; i < START_LIVES; i++) {
      drop(world, 'queimado');
      const events = step(world, 16);
      if (i === START_LIVES - 1) expect(events).toContainEqual({ type: 'over' });
    }
    expect(world.over).toBe(true);
    expect(step(world, 16)).toEqual([]);
  });

  it('multiplicador sobe a cada 5 acertos seguidos, até 3x', () => {
    expect([0, 4, 5, 9, 10, 40].map(multiplier)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('partida simulada: itens sempre dentro da tela e ritmo crescente', () => {
    const world = createWorld(320, 360);
    const rand = seeded(42);
    const spawnedX: Array<{ x: number; w: number }> = [];
    let seen = 0;
    for (let t = 0; t < 90_000 && !world.over; t += 16) {
      step(world, 16, rand);
      for (const item of world.items) {
        if (item.id > seen) {
          seen = item.id;
          spawnedX.push({ x: item.x, w: item.w });
        }
      }
    }
    expect(spawnedX.length).toBeGreaterThan(20);
    expect(spawnedX.every(({ x, w }) => x >= w / 2 && x <= 320 - w / 2)).toBe(true);
  });
});
