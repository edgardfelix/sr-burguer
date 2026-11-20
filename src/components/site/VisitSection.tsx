import { ArrowUpRight, Bike, Store, UtensilsCrossed } from 'lucide-react';
import styled from 'styled-components';
import { WEEK_ORDER, WEEKDAY_NAMES } from '@/lib/schedule';
import { formatCityLine, hasStreetAddress, instagramUrl, mapsUrl } from '@/lib/site';
import type { StoreSettings } from '@/lib/types';
import { formatPhone, toWhatsAppNumber } from '@/lib/whatsapp';
import { c, ease, font, layout, mq, radius } from '@/styles/tokens';

export function VisitSection({ settings }: { settings: StoreSettings }) {
  const insta = instagramUrl(settings.instagram);
  // Loja só de delivery (sem rua cadastrada): a seção mostra a área de entrega no lugar do endereço.
  const storefront = hasStreetAddress(settings.address);
  return (
    <Section id="visite" aria-labelledby="titulo-visite">
      <Wrap>
        <Head>
          <h2 id="titulo-visite">{storefront ? `Onde fica a ${settings.name}` : `Onde a ${settings.name} entrega`}</h2>
          <Address>
            {storefront ? (
              <a href={mapsUrl(settings.address)} target="_blank" rel="noopener noreferrer">
                {[settings.address.street, settings.address.number].filter(Boolean).join(', ')}
              </a>
            ) : (
              <>Delivery em {settings.address.city}</>
            )}
          </Address>
          <p>
            {storefront
              ? `${[settings.address.district, formatCityLine(settings.address)].filter(Boolean).join(', ')}. Peça pelo site, retire no balcão ou coma no salão.`
              : `${formatCityLine(settings.address)}. Peça pelo site e receba o seu lanche em casa.`}
          </p>
          <Modes role="list">
            {settings.acceptsPickup ? (
              <li>
                <UtensilsCrossed aria-hidden /> Salão
              </li>
            ) : null}
            {settings.acceptsDelivery ? (
              <li>
                <Bike aria-hidden /> Entrega
              </li>
            ) : null}
            {settings.acceptsPickup ? (
              <li>
                <Store aria-hidden /> Retirada no balcão
              </li>
            ) : null}
          </Modes>
        </Head>

        <Panel>
          <h3>Horário de funcionamento</h3>
          <Hours>
            {WEEK_ORDER.map((day) => {
              const h = settings.hours[day];
              return (
                <div key={day}>
                  <dt>{WEEKDAY_NAMES[day].charAt(0).toUpperCase() + WEEKDAY_NAMES[day].slice(1)}</dt>
                  <dd data-closed={!h?.enabled}>{h?.enabled ? `${h.open} às ${h.close}` : 'Fechado'}</dd>
                </div>
              );
            })}
          </Hours>
          <Links role="list">
            {settings.whatsapp ? (
              <li>
                <a href={`https://wa.me/${toWhatsAppNumber(settings.whatsapp)}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp {formatPhone(settings.whatsapp)} <ArrowUpRight aria-hidden />
                </a>
              </li>
            ) : null}
            {insta ? (
              <li>
                <a href={insta} target="_blank" rel="noopener noreferrer">
                  Instagram @{settings.instagram} <ArrowUpRight aria-hidden />
                </a>
              </li>
            ) : null}
            {settings.ifoodUrl ? (
              <li>
                <a href={settings.ifoodUrl} target="_blank" rel="noopener noreferrer">
                  Também no iFood <ArrowUpRight aria-hidden />
                </a>
              </li>
            ) : null}
          </Links>
        </Panel>
      </Wrap>
    </Section>
  );
}

const Section = styled.section`
  padding: 56px 0;
  border-top: 1px solid ${c.line};

  ${mq.md} {
    padding: 88px 0;
  }
`;

const Wrap = styled.div`
  display: grid;
  gap: 32px;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};

  ${mq.md} {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 48px;
    align-items: start;
  }
`;

const Head = styled.div`
  display: grid;
  gap: 16px;
  justify-items: start;

  h2 {
    font-size: clamp(1.75rem, 1.3rem + 1.6vw, 2.5rem);
  }

  p {
    color: ${c.inkSoft};
    max-width: 44ch;
  }
`;

const Address = styled.p`
  font-family: ${font.display};
  font-size: clamp(2.25rem, 1.4rem + 4vw, 4.5rem);
  font-weight: 600;
  line-height: 1.02;
  letter-spacing: -0.03em;

  && {
    color: ${c.ink};
    max-width: none;
  }

  a {
    text-decoration: none;
    background-image: linear-gradient(currentColor, currentColor);
    background-size: 0% 2px;
    background-repeat: no-repeat;
    background-position: 0 100%;
    transition: background-size 280ms ${ease.out};
  }

  ${mq.hover} {
    a:hover {
      background-size: 100% 2px;
    }
  }
`;

const Modes = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  font-weight: 600;
  font-size: 0.9375rem;

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  svg {
    width: 18px;
    height: 18px;
    color: ${c.amberInk};
  }
`;

const Panel = styled.div`
  display: grid;
  gap: 18px;
  padding: 24px;
  border-radius: ${radius.lg};
  background: ${c.paper2};

  h3 {
    font-size: 1.0625rem;
    font-weight: 700;
  }
`;

const Hours = styled.dl`
  display: grid;
  margin: 0;

  div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid ${c.line};
    font-size: 1rem;
  }

  div:last-of-type {
    border-bottom: 0;
  }

  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  dd[data-closed='true'] {
    color: ${c.muted};
    font-weight: 500;
  }
`;

const Links = styled.ul`
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    font-weight: 600;
    text-decoration: none;
    color: ${c.ink};
  }

  svg {
    width: 16px;
    height: 16px;
    transition: transform 180ms ${ease.out};
  }

  ${mq.hover} {
    a:hover svg {
      transform: translate(2px, -2px);
    }
    a:hover {
      text-decoration: underline;
    }
  }
`;
