'use client';

/**
 * Reduz e comprime a foto no navegador antes do envio (WebP, lado maior até `maxSize`).
 * Assim o banco guarda imagens pequenas e o upload funciona bem até no 4G da loja.
 */
export async function resizeImageToDataUrl(file: File, maxSize = 900, quality = 0.82): Promise<string> {
  if (!/^image\/(jpeg|png|webp|heic|heif|gif|avif)$/.test(file.type)) {
    throw new Error('Envie uma imagem JPG, PNG ou WebP.');
  }
  if (file.size > 15 * 1024 * 1024) throw new Error('Imagem muito grande. Use uma foto com menos de 15 MB.');

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('Não foi possível ler esta imagem. Tente outra foto.');

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let dataUrl = canvas.toDataURL('image/webp', quality);
  // Navegadores sem WebP no canvas devolvem PNG: cai para JPEG.
  if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', quality);
  // Ainda grande? Reduz a qualidade.
  if (dataUrl.length > 1_100_000) dataUrl = canvas.toDataURL('image/webp', 0.68);
  return dataUrl;
}
