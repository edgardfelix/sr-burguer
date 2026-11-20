import Link from 'next/link';
import styled from 'styled-components';
import { summarizeHours } from '@/lib/schedule';
import { formatCityLine, formatLocationLine, hasStreetAddress, instagramUrl } from '@/lib/site';
import type { StoreSettings } from '@/lib/types';
import { c, layout, mq } from '@/styles/tokens';
import { Logo } from './Logo';

/**
 * Na página inicial, cardápio e endereço são âncoras da própria página.
 * Nas outras páginas viram navegação do Next com pré-carregamento explícito da rota "/" (clique instantâneo).
 */
function SectionLink({ home, hash, children }: { home: boolean; hash: string; children: string }) {
  if (home) return <a href={hash}>{children}</a>;
  return (
    <Link href={`/${hash}`} prefetch>
      {children}
    </Link>
  );
}

export function SiteFooter({ settings, home = true }: { settings: StoreSettings; home?: boolean }) {
  const insta = instagramUrl(settings.instagram);
  return (
    <Footer>
      <Wrap>
        <Brand>
          <Logo size={56} tone="light" src={settings.logo} lazy />
          <p>
            {hasStreetAddress(settings.address) && settings.address.district
              ? `${settings.tagline || 'Hamburgueria'} na ${settings.address.district}, em ${formatCityLine(settings.address)}.`
              : `${settings.tagline || 'Hamburgueria'} com delivery em ${formatCityLine(settings.address)}.`}
          </p>
          <p>{summarizeHours(settings.hours).join('. ')}</p>
        </Brand>
        <Nav aria-label="Rodapé">
          <div>
            <h2>Navegação</h2>
            <ul role="list">
              <li>
                <SectionLink home={home} hash="#cardapio">
                  Cardápio
                </SectionLink>
              </li>
              <li>
                <SectionLink home={home} hash="#visite">
                  {hasStreetAddress(settings.address) ? 'Endereço e horário' : 'Entrega e horário'}
                </SectionLink>
              </li>
              {insta ? (
                <li>
                  <a href={insta} target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <h2>Informações legais</h2>
            <ul role="list">
              <li>
                <Link href="/politica-de-privacidade">Política de privacidade</Link>
              </li>
              <li>
                <Link href="/termos-de-uso">Termos de uso</Link>
              </li>
              <li>
                <Link href="/politica-de-cookies">Política de cookies</Link>
              </li>
            </ul>
          </div>
        </Nav>
      </Wrap>
      <Legal>
        <p>
          © {new Date().getFullYear()} {settings.name}. {formatLocationLine(settings.address)}.
        </p>
      </Legal>
    </Footer>
  );
}

const Footer = styled.footer`
  background: ${c.night};
  color: ${c.cream};
  padding: 56px 0 calc(24px + env(safe-area-inset-bottom, 0px));

  ${mq.md} {
    padding-top: 72px;
  }
`;

const Wrap = styled.div`
  display: grid;
  gap: 40px;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};

  ${mq.md} {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  }
`;

const Brand = styled.div`
  display: grid;
  gap: 14px;
  align-content: start;

  p {
    color: ${c.creamMuted};
    max-width: 40ch;
  }
`;

const Nav = styled.nav`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;

  h2 {
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: ${c.creamMuted};
    margin-bottom: 8px;
  }

  ul {
    display: grid;
    gap: 2px;
  }

  a {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    color: ${c.cream};
    text-decoration: none;
    background-image: linear-gradient(currentColor, currentColor);
    background-size: 0% 1px;
    background-repeat: no-repeat;
    background-position: 0 calc(100% - 10px);
    transition: background-size 240ms ease;
  }

  ${mq.hover} {
    a:hover {
      background-size: 100% 1px;
    }
  }
`;

const Legal = styled.div`
  max-width: ${layout.maxWidth};
  margin: 48px auto 0;
  padding: 20px ${layout.gutter} 0;
  border-top: 1px solid rgba(243, 232, 214, 0.12);
  font-size: 0.875rem;
  color: ${c.creamMuted};
`;
