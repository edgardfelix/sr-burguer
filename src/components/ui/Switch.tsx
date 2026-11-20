'use client';

import styled from 'styled-components';
import { c, ease } from '@/styles/tokens';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Mostra o rótulo ao lado (senão fica só para leitores de tela). */
  showLabel?: boolean;
}

/** Interruptor acessível (role="switch"). Trilho retangular arredondado, nunca pílula. */
export function Switch({ checked, onChange, label, disabled, showLabel = false }: SwitchProps) {
  return (
    <Root>
      <Track
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={showLabel ? undefined : label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        data-checked={checked}
      >
        <Thumb data-checked={checked} />
      </Track>
      {showLabel ? <span>{label}</span> : null}
    </Root>
  );
}

const Root = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
`;

const Track = styled.button`
  position: relative;
  flex: none;
  width: 44px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: rgba(28, 22, 17, 0.22);
  cursor: pointer;
  transition: background-color 180ms ease;

  &[data-checked='true'] {
    background: ${c.green};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* Área de toque de 44px sem aumentar o desenho. */
  &::before {
    content: '';
    position: absolute;
    inset: -9px -2px;
  }
`;

const Thumb = styled.span`
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 200ms ${ease.out};

  &[data-checked='true'] {
    transform: translateX(18px);
  }
`;
