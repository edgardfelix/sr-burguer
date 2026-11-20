import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** Imagem de compartilhamento (WhatsApp, Instagram, Facebook, X): logo real + foto real do hambúrguer. */
export const alt = 'SR Burguer, hambúrguer artesanal com delivery em Itapevi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const dataUrl = (buffer: Buffer, mime: string) => `data:${mime};base64,${buffer.toString('base64')}`;

export default async function OpenGraphImage() {
  // Caminhos literais: o rastreador do build inclui só estes quatro arquivos no deploy.
  const [bold, semibold, logo, burger] = await Promise.all([
    readFile(join(process.cwd(), 'src', 'assets', 'fonts', 'besley-latin-700-normal.woff')),
    readFile(join(process.cwd(), 'src', 'assets', 'fonts', 'besley-latin-600-normal.woff')),
    readFile(join(process.cwd(), 'public', 'images', 'marca', 'logo-srburguer.png')),
    readFile(join(process.cwd(), 'public', 'images', 'marca', 'burger-montado.jpg')),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#17110D', fontFamily: 'Besley' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, padding: '0 64px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl(logo, 'image/png')} width={132} height={132} alt="" style={{ borderRadius: 66 }} />
          <div style={{ display: 'flex', marginTop: 34, fontSize: 88, fontWeight: 700, color: '#F3E8D6', letterSpacing: -2, lineHeight: 1 }}>SR Burguer</div>
          <div style={{ display: 'flex', marginTop: 18, fontSize: 40, fontWeight: 600, color: '#E3922B', lineHeight: 1.15 }}>
            Hambúrguer artesanal com delivery em Itapevi
          </div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 30, fontWeight: 600, color: '#B9AA96' }}>Carne artesanal de 120 g</div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginTop: 34,
              padding: '14px 24px',
              borderRadius: 10,
              background: '#E3922B',
              color: '#1C1611',
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            Cardápio e pedido online
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl(burger, 'image/jpeg')} width={354} height={630} alt="" style={{ objectFit: 'cover' }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Besley', data: bold, weight: 700, style: 'normal' },
        { name: 'Besley', data: semibold, weight: 600, style: 'normal' },
      ],
    },
  );
}
