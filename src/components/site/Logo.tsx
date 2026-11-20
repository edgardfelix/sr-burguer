import Image from 'next/image';
import styled from 'styled-components';
import { SITE } from '@/lib/site';
import { c, font } from '@/styles/tokens';

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  img {
    flex: none;
    border-radius: 50%;
  }
`;

const Wordmark = styled.span`
  font-family: ${font.display};
  font-weight: 700;
  font-size: 1.1875rem;
  letter-spacing: -0.02em;
  line-height: 1;
  color: ${c.ink};
  white-space: nowrap;

  &[data-tone='light'] {
    color: ${c.cream};
  }
`;

/** Logo circular real da marca (recortado sem o anel do Instagram) + nome em texto vivo. */
/**
 * lazy: logo fora da primeira dobra (rodapé). Sem isso, o React pré-carrega a imagem no início da página
 * e ela disputa banda com o pôster do hero (LCP).
 */
export function Logo({
  size = 40,
  tone = 'dark',
  showName = true,
  src,
  lazy = false,
}: {
  size?: number;
  tone?: 'dark' | 'light';
  showName?: boolean;
  src?: string | null;
  lazy?: boolean;
}) {
  const custom = src && src.startsWith('/api/media/');
  return (
    <Wrap>
      <Image
        src={src || '/images/marca/logo-srburguer.png'}
        alt={showName ? '' : SITE.name}
        width={size}
        height={size}
        unoptimized={Boolean(custom)}
        loading={lazy ? 'lazy' : 'eager'}
      />
      {showName ? (
        <Wordmark data-wordmark data-tone={tone}>
          {SITE.name}
        </Wordmark>
      ) : null}
    </Wrap>
  );
}
