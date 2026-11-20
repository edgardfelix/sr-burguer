import { ArrowDown, Clock, MapPin } from 'lucide-react';
import Image from 'next/image';
import styled from 'styled-components';
import { summarizeHours } from '@/lib/schedule';
import { formatLocationLine, hasStreetAddress, mapsUrl } from '@/lib/site';
import type { StoreSettings } from '@/lib/types';
import { c, ease, font, layout, mq, radius } from '@/styles/tokens';
// Import estático: o build gera dimensões e um blur minúsculo embutido (placeholder enquanto a foto chega).
import heroPoster from '../../../public/images/marca/srburguer-hero-poster.webp';
import { Button } from '../ui/Button';
import { HeroStatus } from './HeroStatus';
import { HeroVideo } from './HeroVideo';

export function Hero({ settings }: { settings: StoreSettings }) {
  const hours = summarizeHours(settings.hours);
  return (
    <Section id="inicio" aria-labelledby="titulo-principal">
      <Wrap>
        <Text>
          <HeroStatus />
          <Title id="titulo-principal">Hambúrguer artesanal em Itapevi</Title>
          <Lead>Lanches com carne artesanal de 120 g, combos e promoções, com delivery na sua casa.</Lead>
          <Actions>
            <Button as="a" href="#cardapio" data-size="lg">
              Ver cardápio
              <ArrowDown aria-hidden />
            </Button>
          </Actions>
          <Facts role="list">
            <li>
              <Clock aria-hidden />
              <span>{hours.length ? hours.join('. ') : 'Horário em atualização'}</span>
            </li>
            <li>
              <MapPin aria-hidden />
              {hasStreetAddress(settings.address) ? (
                <a href={mapsUrl(settings.address)} target="_blank" rel="noopener noreferrer">
                  {formatLocationLine(settings.address)}
                </a>
              ) : (
                <span>{formatLocationLine(settings.address)}</span>
              )}
            </li>
          </Facts>
        </Text>
        <div>
          <Frame>
            {/* Imagem LCP: vem no HTML do servidor, pré-carregada no <head> com prioridade alta. */}
            <Image
              src={heroPoster}
              alt="Hambúrguer artesanal da SR Burguer com cheddar derretido sobre a carne"
              fill
              preload
              fetchPriority="high"
              placeholder="blur"
              sizes="(min-width: 1024px) 380px, (min-width: 768px) 38vw, 92vw"
              quality={82}
            />
            <HeroVideo />
          </Frame>
        </div>
      </Wrap>
    </Section>
  );
}

const Section = styled.section`
  padding: 20px 0 40px;

  ${mq.md} {
    padding: 32px 0 56px;
  }
  ${mq.lg} {
    padding: 40px 0 72px;
  }
`;

const Wrap = styled.div`
  display: grid;
  gap: 28px;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};

  ${mq.md} {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    align-items: center;
    gap: 40px;
  }
`;

/* Entrada só com deslocamento (sem opacidade 0): o texto aparece na primeira pintura e não atrasa o LCP. */
const Text = styled.div`
  display: grid;
  justify-items: start;
  gap: 18px;

  @media (prefers-reduced-motion: no-preference) {
    animation: bb-hero-in 560ms ${ease.out} both;
  }

  @keyframes bb-hero-in {
    from {
      transform: translateY(8px);
    }
    to {
      transform: none;
    }
  }
`;

const Title = styled.h1`
  font-family: ${font.display};
  font-size: clamp(2.375rem, 1.55rem + 3.6vw, 4.375rem);
  font-weight: 650;
  line-height: 1.02;
  letter-spacing: -0.028em;
  max-width: 13ch;
`;

const Lead = styled.p`
  font-size: 1.125rem;
  line-height: 1.5;
  color: ${c.inkSoft};
  max-width: 38ch;

  ${mq.lg} {
    font-size: 1.25rem;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  width: 100%;

  a {
    width: 100%;
  }

  ${mq.sm} {
    a {
      width: auto;
    }
  }
`;

const Facts = styled.ul`
  display: grid;
  gap: 10px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.9375rem;
  color: ${c.inkSoft};

  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  svg {
    flex: none;
    width: 18px;
    height: 18px;
    margin-top: 2px;
    color: ${c.amberInk};
  }

  a {
    color: inherit;
    text-decoration-color: ${c.lineStrong};
    transition: text-decoration-color 160ms ease;
  }

  ${mq.hover} {
    a:hover {
      text-decoration-color: ${c.ink};
    }
  }
`;

/*
 * Moldura do pôster e do vídeo. O fundo escuro e o blur do pôster seguram o espaço (sem salto de layout)
 * até a foto chegar; o vídeo entra por cima com esmaecer quando o primeiro quadro está pronto.
 */
const Frame = styled.div`
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 4 / 5;
  max-height: 520px;
  border-radius: ${radius.lg};
  background: ${c.night};
  isolation: isolate;

  img,
  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 62%;
  }

  video {
    opacity: 0;
    transition: opacity 500ms ease;
  }
  video[data-visible='true'] {
    opacity: 1;
  }

  ${mq.md} {
    aspect-ratio: 9 / 16;
    max-height: none;
    height: min(76svh, 680px);
    width: auto;
    margin-left: auto;
  }
`;
