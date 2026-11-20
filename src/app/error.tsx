'use client';

import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import styled from 'styled-components';
import { Logo } from '@/components/site/Logo';
import { Button } from '@/components/ui/Button';
import { c, layout } from '@/styles/tokens';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Main id="conteudo">
      <Logo size={56} showName={false} />
      <h1>Algo saiu errado por aqui</h1>
      <p>A página não carregou como deveria. Tente de novo; se continuar, recarregue o cardápio.</p>
      <Actions>
        <Button type="button" data-size="lg" onClick={reset}>
          <RefreshCcw aria-hidden /> Tentar de novo
        </Button>
        <Button as={Link} href="/" data-variant="secondary" data-size="lg">
          Ver cardápio
        </Button>
      </Actions>
      {error.digest ? <small>Código do erro: {error.digest}</small> : null}
    </Main>
  );
}

const Main = styled.main`
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 18px;
  min-height: 100svh;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 40px ${layout.gutter};

  h1 {
    font-size: clamp(2rem, 1.4rem + 2.6vw, 3.25rem);
    max-width: 16ch;
  }

  p {
    max-width: 46ch;
    font-size: 1.125rem;
    color: ${c.inkSoft};
  }

  small {
    color: ${c.muted};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;
