import styled from 'styled-components';
import { c, ease, font, mq, radius } from '@/styles/tokens';

/**
 * Um único estilo de botão (tinta) e suas variações por data-attribute (compatível com RSC).
 * data-variant: primary (padrão) | secondary | accent | ghost | danger
 * data-size: md (padrão) | sm | lg
 */
export const Button = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: ${radius.md};
  background: ${c.ink};
  color: ${c.paper};
  font-family: ${font.text};
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.005em;
  line-height: 1.1;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 160ms ${ease.out},
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    opacity 180ms ease;

  svg {
    flex: none;
    width: 18px;
    height: 18px;
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  ${mq.hover} {
    &:hover:not(:disabled) {
      background: #33281f;
    }
  }

  &[data-size='sm'] {
    min-height: 40px;
    padding: 0 14px;
    font-size: 0.9375rem;
    gap: 8px;
  }

  &[data-size='lg'] {
    min-height: 56px;
    padding: 0 24px;
    font-size: 1.0625rem;
  }

  &[data-block='true'] {
    width: 100%;
  }

  &[data-variant='secondary'] {
    background: transparent;
    color: ${c.ink};
    border-color: ${c.lineStrong};
    ${mq.hover} {
      &:hover:not(:disabled) {
        background: rgba(28, 22, 17, 0.05);
        border-color: ${c.ink};
      }
    }
  }

  &[data-variant='accent'] {
    background: ${c.amber};
    color: ${c.ink};
    ${mq.hover} {
      &:hover:not(:disabled) {
        background: #d8861f;
      }
    }
  }

  &[data-variant='ghost'] {
    background: transparent;
    color: ${c.ink};
    ${mq.hover} {
      &:hover:not(:disabled) {
        background: rgba(28, 22, 17, 0.06);
      }
    }
  }

  &[data-variant='danger'] {
    background: ${c.red};
    color: #fff8ee;
    ${mq.hover} {
      &:hover:not(:disabled) {
        background: #9f2a1a;
      }
    }
  }

  &[data-variant='light'] {
    background: ${c.cream};
    color: ${c.night};
    ${mq.hover} {
      &:hover:not(:disabled) {
        background: #fff6e8;
      }
    }
  }

  &:disabled,
  &[aria-disabled='true'] {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &[data-loading='true'] {
    color: transparent;
    pointer-events: none;
  }
  &[data-loading='true']::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-color: ${c.paper} ${c.paper} transparent transparent;
    animation: bb-spin 600ms linear infinite;
  }
  &[data-variant='secondary'][data-loading='true']::after,
  &[data-variant='ghost'][data-loading='true']::after,
  &[data-variant='accent'][data-loading='true']::after {
    border-color: ${c.ink} ${c.ink} transparent transparent;
  }

  @keyframes bb-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const IconButton = styled.button`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${radius.md};
  background: transparent;
  color: ${c.ink};
  cursor: pointer;
  transition:
    transform 160ms ${ease.out},
    background-color 160ms ease,
    border-color 160ms ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:active:not(:disabled) {
    transform: scale(0.94);
  }

  ${mq.hover} {
    &:hover:not(:disabled) {
      background: rgba(28, 22, 17, 0.07);
    }
  }

  &[data-variant='outline'] {
    border-color: ${c.lineStrong};
  }

  &[data-variant='solid'] {
    background: ${c.ink};
    color: ${c.paper};
    ${mq.hover} {
      &:hover:not(:disabled) {
        background: #33281f;
      }
    }
  }

  &[data-variant='accent'] {
    background: ${c.amber};
    color: ${c.ink};
    ${mq.hover} {
      &:hover:not(:disabled) {
        background: #d8861f;
      }
    }
  }

  &[data-size='sm'] {
    width: 36px;
    height: 36px;
    svg {
      width: 18px;
      height: 18px;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
