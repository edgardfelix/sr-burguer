#!/usr/bin/env node
/**
 * Pipeline de assets da SR Burguer.
 *
 * Lê os arquivos reais de /assets e gera versões otimizadas em /public e /src/app:
 *  - miniaturas dos lanches recortadas do post do cardápio e do post da promoção (WebP);
 *  - logo circular (do cartão final do vídeo da casa) + favicon.ico + ícones;
 *  - vídeo do hero montado com cenas reais da chapa e da montagem, sem áudio, e pôster.
 *
 * Uso: yarn assets
 * O vídeo só é processado se houver ffmpeg: defina FFMPEG_PATH ou tenha `ffmpeg` no PATH.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => join(root, 'assets', ...p);
const out = (...p) => join(root, ...p);

const ensureDir = (file) => mkdirSync(dirname(file), { recursive: true });

/**
 * [slug, x, y, largura, altura] nas capturas do Instagram (720x1640), sempre em 4:3 como o card do cardápio.
 * Recortes medidos para ficar dentro das linhas divisórias e dos ícones do post.
 */
const PHOTO_CROPS = {
  'cardapio.jpeg': [
    ['sr-burguer', 92, 504, 194, 145],
    ['sr-salad', 90, 652, 196, 147],
    ['sr-salad-bacon', 90, 808, 200, 150],
    ['sr-cheddar-melt', 92, 965, 196, 147],
  ],
  'promocao.jpeg': [['promocao-2-lanches', 0, 545, 360, 270]],
};

async function processPhotos() {
  const dir = out('public', 'images', 'produtos');
  mkdirSync(dir, { recursive: true });
  for (const [file, crops] of Object.entries(PHOTO_CROPS)) {
    for (const [slug, x, y, w, h] of crops) {
      const target = join(dir, `${slug}.webp`);
      ensureDir(target);
      await sharp(src('produtos', file))
        .extract({ left: x, top: y, width: w, height: h })
        .webp({ quality: 90, effort: 6 })
        .toFile(target);
      console.log('foto  ', slug);
    }
  }
}

/**
 * Logo: assets/logo/logo-hd.png é o cartão final do vídeo (quadro de 45,5 s) recortado em 720x720,
 * com o selo inteiro (inclusive as pontas da faixa "BURGUER") dentro do círculo de raio 360.
 */
async function processLogo() {
  const size = 720;
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  const circle = await sharp(src('logo', 'logo-hd.png'))
    .resize(size, size)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const badge = await sharp(circle).resize(384, 384, { kernel: 'lanczos3' }).png().toBuffer();

  const brandDir = out('public', 'images', 'marca');
  mkdirSync(brandDir, { recursive: true });
  await sharp(badge).png({ compressionLevel: 9 }).toFile(join(brandDir, 'logo-srburguer.png'));
  await sharp(badge).webp({ quality: 92, alphaQuality: 100 }).toFile(join(brandDir, 'logo-srburguer.webp'));

  // Ícones do App Router (src/app): favicon.ico (16/32/48), icon.png e apple-icon.png.
  const appDir = out('src', 'app');
  const pngAt = (px) => sharp(circle).resize(px, px, { kernel: 'lanczos3' }).png().toBuffer();
  const icoSizes = [16, 32, 48];
  const icoImages = await Promise.all(icoSizes.map(pngAt));
  writeFileSync(join(appDir, 'favicon.ico'), buildIco(icoImages, icoSizes));
  await sharp(circle).resize(192, 192, { kernel: 'lanczos3' }).png().toFile(join(appDir, 'icon.png'));

  // Apple não respeita transparência: selo sobre o creme da marca.
  const apple = await sharp(circle).resize(156, 156, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp({ create: { width: 180, height: 180, channels: 4, background: '#F5EEE3' } })
    .composite([{ input: apple, left: 12, top: 12 }])
    .png()
    .toFile(join(appDir, 'apple-icon.png'));

  // Ícone do manifesto (PWA) em fundo escuro da marca.
  const maskable = await sharp(circle).resize(150, 150, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp({ create: { width: 192, height: 192, channels: 4, background: '#17110D' } })
    .composite([{ input: maskable, left: 21, top: 21 }])
    .png()
    .toFile(join(brandDir, 'icon-192.png'));
  console.log('logo   selo, favicon.ico, icon.png, apple-icon.png, icon-192.png');
}

/** ICO com PNGs embutidos (suportado por todos os navegadores atuais). */
function buildIco(pngs, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  pngs.forEach((png, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 0);
    e.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

function findFfmpeg() {
  const candidates = [process.env.FFMPEG_PATH, 'ffmpeg'].filter(Boolean);
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['-version'], { stdio: 'ignore' });
      return bin;
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

/**
 * Vídeo do hero, a partir do vídeo da casa (47 s, 720x1280). As trocas de cena são "chicotes" borrados de
 * 0,1 a 0,2 s (36,5 / 37,8 / 39,1 / 11,5 s) e o cartão do logo começa em 43,93 s (fica de fora). Ordem das cenas:
 *  1. 39,3 a 43,9 s: molho cheddar, bacon e pão por cima (começa num quadro nítido, que vira o pôster);
 *  2. 4,0 a 11,6 s: smash na chapa e cheddar derretendo, terminando no chicote do próprio vídeo;
 *  3. 36,6 a 39,3 s: molho no pão e carne montada, que emenda sem corte no início do loop.
 */
const SEGMENTS = [
  [39.3, 43.9],
  [4.0, 11.6],
  [36.6, 39.3],
];
const POSTER_AT = SEGMENTS[0][0];
/** Hambúrguer montado com bacon, antes do pão de cima (imagem de compartilhamento e dados estruturados). */
const STILL_AT = 43.0;

const VIDEO_FILTER = [
  ...SEGMENTS.map(([start, end], i) => `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[s${i}]`),
  `${SEGMENTS.map((_, i) => `[s${i}]`).join('')}concat=n=${SEGMENTS.length}:v=1:a=0,scale=360:640:flags=lanczos,format=yuv420p[v]`,
].join(';');

async function processVideo() {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    console.log('video  ffmpeg não encontrado: defina FFMPEG_PATH para processar o vídeo.');
    return;
  }
  const input = src('videos', 'video-srburguer.mp4');
  const videoDir = out('public', 'video');
  mkdirSync(videoDir, { recursive: true });
  const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

  run(['-i', input, '-an', '-filter_complex', VIDEO_FILTER, '-map', '[v]', '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow',
    '-crf', '28', '-movflags', '+faststart', join(videoDir, 'srburguer-hero.mp4')]);
  run(['-i', input, '-an', '-filter_complex', VIDEO_FILTER, '-map', '[v]', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '44',
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', join(videoDir, 'srburguer-hero.webm')]);

  // Pôster = primeiro quadro do loop (sem salto quando a reprodução começa). Fica em /images para o next/image.
  const posterPng = join(videoDir, '.poster.png');
  run(['-ss', String(POSTER_AT), '-i', input, '-frames:v', '1', '-vf', 'scale=360:640:flags=lanczos', posterPng]);
  await sharp(posterPng).webp({ quality: 88 }).toFile(out('public', 'images', 'marca', 'srburguer-hero-poster.webp'));

  const stillPng = join(videoDir, '.still.png');
  run(['-ss', String(STILL_AT), '-i', input, '-frames:v', '1', stillPng]);
  await sharp(stillPng).jpeg({ quality: 90, mozjpeg: true }).toFile(out('public', 'images', 'marca', 'burger-montado.jpg'));

  for (const tmp of [posterPng, stillPng]) rmSync(tmp, { force: true });
  console.log('video  srburguer-hero.mp4, srburguer-hero.webm, pôster e quadro do hambúrguer montado');
}

if (!existsSync(src('produtos'))) {
  console.error('Pasta assets/produtos não encontrada.');
  process.exit(1);
}

await processPhotos();
await processLogo();
await processVideo();
console.log('Assets prontos.');
