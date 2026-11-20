import Link from 'next/link';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { CookieNotice } from '@/components/site/CookieNotice';
import { Logo } from '@/components/site/Logo';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Button } from '@/components/ui/Button';
import { loadMenu } from '@/server/services/catalog';
import { c, font, layout, mq } from '@/styles/tokens';

export const revalidate = 3600;

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const { settings } = await loadMenu();
  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <Header>
        <Inner>
          {/* Navegação principal de volta ao cardápio: rota "/" pré-carregada por inteiro. */}
          <Link href="/" prefetch aria-label="SR Burguer, ir para o cardápio">
            <Logo size={40} />
          </Link>
          <Button as={Link} href="/#cardapio" prefetch data-size="sm" data-variant="secondary">
            Ver cardápio
          </Button>
        </Inner>
      </Header>
      <Main id="conteudo">
        <Prose>{children}</Prose>
      </Main>
      <SiteFooter settings={settings} home={false} />
      <CookieNotice />
    </>
  );
}

const Header = styled.header`
  border-bottom: 1px solid ${c.line};
  background: ${c.paper};
`;

const Inner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: ${layout.header};
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};

  > a {
    text-decoration: none;
    border-radius: 6px;
  }
`;

const Main = styled.main`
  padding: 40px ${layout.gutter} 72px;

  ${mq.md} {
    padding-top: 64px;
  }
`;

const Prose = styled.article`
  max-width: 720px;
  margin: 0 auto;
  color: ${c.inkSoft};
  font-size: 1.0625rem;
  line-height: 1.65;

  h1 {
    font-size: clamp(2.125rem, 1.5rem + 2.4vw, 3.25rem);
    color: ${c.ink};
    margin-bottom: 12px;
  }

  > p:first-of-type {
    font-size: 0.9375rem;
    color: ${c.muted};
    margin-bottom: 32px;
  }

  h2 {
    font-family: ${font.display};
    font-size: 1.5rem;
    color: ${c.ink};
    margin: 40px 0 12px;
  }

  p + p {
    margin-top: 12px;
  }

  ul {
    margin: 12px 0;
    padding-left: 22px;
  }

  li + li {
    margin-top: 6px;
  }

  table {
    width: 100%;
    margin: 16px 0;
    border-collapse: collapse;
    font-size: 0.9375rem;
  }

  th,
  td {
    padding: 10px 8px;
    border-bottom: 1px solid ${c.line};
    text-align: left;
    vertical-align: top;
  }

  th {
    color: ${c.ink};
    font-weight: 700;
  }

  code {
    font-size: 0.875rem;
    padding: 1px 5px;
    border-radius: 4px;
    background: ${c.paper2};
  }

  a {
    color: ${c.ink};
    font-weight: 600;
  }
`;
