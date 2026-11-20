import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { CartLayer } from '@/components/site/CartLayer';
import { Hero } from '@/components/site/Hero';
import { Menu } from '@/components/site/Menu';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { StoreProvider } from '@/components/site/StoreProvider';
import { VisitSection } from '@/components/site/VisitSection';
import { buildStructuredData } from '@/lib/seo';
import { loadMenu } from '@/server/services/catalog';

/** ISR: página estática na CDN, revalidada pelo painel a cada alteração (e a cada 5 min como reserva). */
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
};

export default async function HomePage() {
  const { catalog, settings, loadedAt: renderedAt } = await loadMenu();

  return (
    <StoreProvider catalog={catalog} settings={settings} renderedAt={renderedAt}>
      <a href="#cardapio" className="skip-link">
        Pular para o cardápio
      </a>
      <SiteHeader />
      <main id="conteudo">
        <Hero settings={settings} />
        <Menu />
        <VisitSection settings={settings} />
      </main>
      <SiteFooter settings={settings} />
      <CartLayer />
      <JsonLd data={buildStructuredData(settings, catalog, renderedAt)} />
    </StoreProvider>
  );
}
