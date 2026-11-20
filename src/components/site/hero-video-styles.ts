import styled from 'styled-components';
import { c, ease, mq, radius } from '@/styles/tokens';

/** Botão de reproduzir e pausar sobre o vídeo do hero (WCAG 2.2.2: movimento pode ser pausado). */
export const VideoToggle = styled.button`
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: ${radius.md};
  background: rgba(23, 17, 13, 0.62);
  color: ${c.cream};
  cursor: pointer;
  transition:
    transform 160ms ${ease.out},
    background-color 160ms ease;

  svg {
    width: 18px;
    height: 18px;
  }

  svg[data-spin] {
    animation: bb-video-spin 900ms linear infinite;
  }

  &:active {
    transform: scale(0.94);
  }

  ${mq.hover} {
    &:hover {
      background: rgba(23, 17, 13, 0.82);
    }
  }

  ${mq.reduced} {
    svg[data-spin] {
      animation: none;
    }
  }

  @keyframes bb-video-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
