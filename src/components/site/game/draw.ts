import { catchLine, FLOOR_H, LAYER_H, PLATE_H, PLATE_W, type Kind, type World } from './engine';

/**
 * Desenho do jogo em canvas 2D, com a paleta da marca (mesmos valores dos tokens em styles/global.ts):
 * fundo noite, balcão marrom, pão âmbar. Formas simples, sem imagens externas.
 */
const COLORS = {
  night: '#17110D',
  night2: '#241B15',
  counter: '#2B2019',
  counterEdge: '#96500F',
  amber: '#E3922B',
  amberDeep: '#C7741F',
  cream: '#F3E8D6',
  creamMuted: '#B9AA96',
  red: '#B83220',
} as const;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wavy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, waves: number): void {
  const step = w / waves;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.35);
  for (let i = 0; i < waves; i++) {
    const sx = x + i * step;
    ctx.quadraticCurveTo(sx + step / 2, y - h * 0.25, sx + step, y + h * 0.35);
  }
  ctx.lineTo(x + w, y + h * 0.8);
  for (let i = waves; i > 0; i--) {
    const sx = x + i * step;
    ctx.quadraticCurveTo(sx - step / 2, y + h * 1.15, sx - step, y + h * 0.8);
  }
  ctx.closePath();
}

/** Desenha um ingrediente centrado em (cx, cy) com a largura e altura dadas. */
export function drawIngredient(ctx: CanvasRenderingContext2D, kind: Kind, cx: number, cy: number, w: number, h: number): void {
  const x = cx - w / 2;
  const y = cy - h / 2;
  switch (kind) {
    case 'pao': {
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, '#EDA94A');
      grad.addColorStop(1, COLORS.amberDeep);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.bezierCurveTo(x, y - h * 0.15, x + w, y - h * 0.15, x + w, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.cream;
      const seeds: Array<[number, number]> = [
        [0.3, 0.42],
        [0.5, 0.3],
        [0.7, 0.42],
        [0.4, 0.62],
        [0.6, 0.62],
      ];
      for (const [sx, sy] of seeds) {
        ctx.beginPath();
        ctx.ellipse(x + w * sx, y + h * sy, 2.4, 1.3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'carne': {
      ctx.fillStyle = '#5B3421';
      rounded(ctx, x, y, w, h, h / 2.2);
      ctx.fill();
      ctx.strokeStyle = '#3A2015';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y + h * 0.35);
      ctx.lineTo(x + w * 0.4, y + h * 0.35);
      ctx.moveTo(x + w * 0.55, y + h * 0.35);
      ctx.lineTo(x + w * 0.72, y + h * 0.35);
      ctx.stroke();
      break;
    }
    case 'queimado': {
      // Carvão com brasas e fumaça: precisa saltar aos olhos no fundo escuro para dar tempo de desviar.
      ctx.fillStyle = '#3B332D';
      rounded(ctx, x, y, w, h, h / 2.2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 115, 92, 0.75)';
      ctx.lineWidth = 1.5;
      rounded(ctx, x, y, w, h, h / 2.2);
      ctx.stroke();
      ctx.strokeStyle = '#F08A4B';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.6);
      ctx.lineTo(x + w * 0.35, y + h * 0.4);
      ctx.lineTo(x + w * 0.5, y + h * 0.62);
      ctx.moveTo(x + w * 0.62, y + h * 0.35);
      ctx.lineTo(x + w * 0.8, y + h * 0.55);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(225, 212, 196, 0.75)';
      ctx.lineWidth = 2;
      for (const offset of [0.3, 0.55, 0.78]) {
        ctx.beginPath();
        ctx.moveTo(x + w * offset, y - 2);
        ctx.bezierCurveTo(x + w * offset - 5, y - 8, x + w * offset + 5, y - 12, x + w * offset, y - 18);
        ctx.stroke();
      }
      break;
    }
    case 'queijo': {
      ctx.fillStyle = '#F2C14E';
      rounded(ctx, x, y, w, h * 0.7, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.38, y + h * 0.6);
      ctx.lineTo(x + w * 0.5, y + h * 1.15);
      ctx.lineTo(x + w * 0.62, y + h * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'alface': {
      ctx.fillStyle = '#5DA04F';
      wavy(ctx, x, y, w, h, 5);
      ctx.fill();
      ctx.strokeStyle = '#8CC67A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + h * 0.55);
      ctx.lineTo(x + w - 4, y + h * 0.55);
      ctx.stroke();
      break;
    }
    case 'tomate': {
      ctx.fillStyle = '#C8442F';
      rounded(ctx, x, y, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = '#E8735C';
      for (const sx of [0.28, 0.5, 0.72]) {
        ctx.beginPath();
        ctx.ellipse(x + w * sx, y + h / 2, 3.2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'bacon': {
      ctx.fillStyle = '#A8432C';
      wavy(ctx, x, y, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = '#F0D2B4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + h * 0.55);
      ctx.bezierCurveTo(x + w * 0.33, y + h * 0.2, x + w * 0.66, y + h * 0.9, x + w - 4, y + h * 0.5);
      ctx.stroke();
      break;
    }
    case 'cebola': {
      ctx.strokeStyle = '#EFE3C8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2 - 2, h / 2 - 1, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#CDBB97';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2 - 8, Math.max(1, h / 2 - 4), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, world: World): void {
  const grad = ctx.createLinearGradient(0, 0, 0, world.height);
  grad.addColorStop(0, COLORS.night2);
  grad.addColorStop(1, COLORS.night);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, world.width, world.height);

  const top = world.height - FLOOR_H;
  ctx.fillStyle = COLORS.counter;
  ctx.fillRect(0, top, world.width, FLOOR_H);
  ctx.fillStyle = COLORS.counterEdge;
  ctx.fillRect(0, top, world.width, 2);
}

function drawPlayer(ctx: CanvasRenderingContext2D, world: World, stack: readonly Kind[]): void {
  const baseY = world.height - FLOOR_H - PLATE_H;
  const x = world.playerX - PLATE_W / 2;
  ctx.fillStyle = COLORS.amberDeep;
  rounded(ctx, x, baseY, PLATE_W, PLATE_H, 6);
  ctx.fill();
  ctx.fillStyle = '#EDA94A';
  rounded(ctx, x, baseY, PLATE_W, PLATE_H * 0.45, 5);
  ctx.fill();

  stack.forEach((kind, index) => {
    const cy = baseY - index * LAYER_H - LAYER_H / 2;
    drawIngredient(ctx, kind, world.playerX + (index % 2 ? 2 : -2), cy, PLATE_W - 8, LAYER_H + 4);
  });
}

/** Quadro completo. `demo` desenha um lanche pronto para a tela de início. */
export function drawWorld(ctx: CanvasRenderingContext2D, world: World, fontFamily: string, demo = false): void {
  ctx.clearRect(0, 0, world.width, world.height);
  drawBackground(ctx, world);

  const stack: readonly Kind[] = demo ? ['carne', 'queijo', 'bacon', 'alface', 'tomate'] : world.stack;
  drawPlayer(ctx, world, stack);
  if (demo) {
    const topY = world.height - FLOOR_H - PLATE_H - stack.length * LAYER_H - 14;
    drawIngredient(ctx, 'pao', world.playerX, topY, PLATE_W - 4, 28);
  }

  for (const item of world.items) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    drawIngredient(ctx, item.kind, 0, 0, item.w, item.h);
    ctx.restore();
  }

  if (!demo && world.items.length === 0 && world.elapsed < 1200) {
    // Guia discreto da linha de pegada nos primeiros instantes.
    ctx.strokeStyle = 'rgba(243, 232, 214, 0.18)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    const line = catchLine(world);
    ctx.moveTo(world.playerX - PLATE_W / 2, line);
    ctx.lineTo(world.playerX + PLATE_W / 2, line);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.textAlign = 'center';
  ctx.font = `700 15px ${fontFamily}`;
  for (const p of world.pops) {
    const alpha = Math.max(0, 1 - p.age / 750);
    ctx.fillStyle = p.tone === 'good' ? `rgba(227, 146, 43, ${alpha})` : `rgba(232, 115, 92, ${alpha})`;
    ctx.fillText(p.text, p.x, p.y - p.age * 0.05);
  }

  if (world.flash > 0) {
    ctx.fillStyle = `rgba(184, 50, 32, ${(world.flash / 320) * 0.28})`;
    ctx.fillRect(0, 0, world.width, world.height);
  }
}
