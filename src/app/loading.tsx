'use client';

import styled from 'styled-components';
import { Skeleton } from '@/components/ui/Skeleton';
import { c, layout, mq } from '@/styles/tokens';

/** Esqueleto do cardápio: mesma geometria da página real, sem saltos ao carregar. */
export default function Loading() {
  return (
    <Page aria-busy="true" aria-label="Carregando o cardápio">
      <Header>
        <Skeleton style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <Skeleton style={{ width: 140, height: 18 }} />
        <span style={{ flex: 1 }} />
        <Skeleton style={{ width: 96, height: 44 }} />
      </Header>
      <Hero>
        <div>
          <Skeleton style={{ width: 180, height: 28 }} />
          <Skeleton style={{ width: '92%', height: 52, marginTop: 18 }} />
          <Skeleton style={{ width: '70%', height: 52, marginTop: 10 }} />
          <Skeleton style={{ width: '80%', height: 20, marginTop: 22 }} />
          <Skeleton style={{ width: 200, height: 56, marginTop: 24 }} />
        </div>
        <Skeleton className="media" />
      </Hero>
      <Nav>
        {[96, 120, 88, 110, 92].map((w, i) => (
          <Skeleton key={i} style={{ width: w, height: 18 }} />
        ))}
      </Nav>
      <Rows>
        {Array.from({ length: 6 }, (_, i) => (
          <Row key={i}>
            <div>
              <Skeleton style={{ width: '60%', height: 18 }} />
              <Skeleton style={{ width: '95%', height: 14, marginTop: 10 }} />
              <Skeleton style={{ width: '75%', height: 14, marginTop: 6 }} />
              <Skeleton style={{ width: 80, height: 18, marginTop: 14 }} />
            </div>
            <Skeleton style={{ width: 120, height: 90 }} />
          </Row>
        ))}
      </Rows>
    </Page>
  );
}

const Page = styled.div`
  min-height: 100vh;
  background: ${c.paper};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  height: ${layout.header};
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};
`;

const Hero = styled.div`
  display: grid;
  gap: 28px;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 20px ${layout.gutter} 40px;

  .media {
    width: 100%;
    aspect-ratio: 4 / 5;
    max-height: 520px;
    border-radius: 12px;
  }

  ${mq.md} {
    grid-template-columns: 1.25fr 1fr;
    align-items: center;
    .media {
      aspect-ratio: 9 / 16;
      height: min(76svh, 680px);
      width: auto;
      margin-left: auto;
    }
  }
`;

const Nav = styled.div`
  display: flex;
  gap: 24px;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 17px ${layout.gutter};
  border-top: 1px solid ${c.line};
  border-bottom: 1px solid ${c.line};
  overflow: hidden;
`;

const Rows = styled.div`
  display: grid;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 24px ${layout.gutter};

  ${mq.md} {
    grid-template-columns: 1fr 1fr;
    column-gap: 40px;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid ${c.line};
`;
