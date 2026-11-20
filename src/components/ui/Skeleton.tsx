import styled, { keyframes } from 'styled-components';
import { radius } from '@/styles/tokens';

const sweep = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
`;

/** Bloco de carregamento com brilho que varre da esquerda para a direita (sem pulsar). */
export const Skeleton = styled.span`
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: ${radius.sm};
  background: rgba(28, 22, 17, 0.07);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 252, 246, 0.65), transparent);
    animation: ${sweep} 1.4s ease-in-out infinite;
  }

  &[data-tone='dark'] {
    background: rgba(243, 232, 214, 0.08);
  }
  &[data-tone='dark']::after {
    background: linear-gradient(90deg, transparent, rgba(243, 232, 214, 0.12), transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
    }
  }
`;
