import type { Metadata, Viewport } from 'next';
import { Albert_Sans, Besley } from 'next/font/google';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/Toaster';
import { getSiteUrl, SITE } from '@/lib/site';
import { GlobalStyle } from '@/styles/global';
import { StyledComponentsRegistry } from '@/styles/registry';

const display = Besley({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const text = Albert_Sans({
  subsets: ['latin'],
  variable: '--font-text',
  display: 'swap',
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: SITE.title, template: '%s | SR Burguer' },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  category: 'food',
  keywords: ['hamburgueria', 'hambúrguer artesanal', 'lanche artesanal', 'Itapevi', 'delivery', 'hamburgueria delivery Itapevi', 'SR Burguer'],
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
    // Mesma imagem gerada em app/opengraph-image.tsx.
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'SR Burguer, hambúrguer artesanal com delivery em Itapevi' }],
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: SITE.themeColor,
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${text.variable}`}>
      <body>
        <StyledComponentsRegistry>
          <GlobalStyle />
          {children}
          <Toaster />
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
