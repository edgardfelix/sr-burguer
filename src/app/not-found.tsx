import type { Metadata } from 'next';
import Link from 'next/link';
import styled from 'styled-components';
import { Logo } from '@/components/site/Logo';
import { Button } from '@/components/ui/Button';
import { c, font, layout } from '@/styles/tokens';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Page>
      <Top>
        <Link href="/" prefetch aria-label="SR Burguer, ir para o cardápio">
          <Logo size={40} />
        </Link>
      </Top>
      <Main id="conteudo">
        <Code aria-hidden>404</Code>
        <h1>Página não encontrada</h1>
        <p>O endereço pode ter mudado ou o link está incompleto. O cardápio continua no mesmo lugar, com pedido para delivery.</p>
        <Actions>
          <Button as={Link} href="/#cardapio" prefetch data-size="lg">
            Ver cardápio
          </Button>
          <Button as={Link} href="/#visite" prefetch data-variant="secondary" data-size="lg">
            Ver endereço e horário
          </Button>
        </Actions>
      </Main>
    </Page>
  );
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  background: ${c.paper};
`;

const Top = styled.header`
  display: flex;
  align-items: center;
  height: ${layout.header};
  max-width: ${layout.maxWidth};
  width: 100%;
  margin: 0 auto;
  padding: 0 ${layout.gutter};

  a {
    text-decoration: none;
    border-radius: 6px;
  }
`;

const Main = styled.main`
  flex: 1;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 18px;
  max-width: ${layout.maxWidth};
  width: 100%;
  margin: 0 auto;
  padding: 40px ${layout.gutter} 80px;

  h1 {
    font-size: clamp(2.25rem, 1.5rem + 3vw, 3.75rem);
    max-width: 14ch;
  }

  p {
    max-width: 46ch;
    font-size: 1.125rem;
    color: ${c.inkSoft};
  }
`;

const Code = styled.p`
  && {
    font-family: ${font.display};
    font-size: clamp(6rem, 3rem + 14vw, 13rem);
    font-weight: 700;
    line-height: 0.85;
    letter-spacing: -0.05em;
    color: ${c.amber};
    max-width: none;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;
