'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import styled from 'styled-components';
import { c, radius } from '@/styles/tokens';
import { IconButton } from './Button';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  /** Quando true, o botão de diminuir vira lixeira na quantidade mínima. */
  removable?: boolean;
  size?: 'sm' | 'md';
}

export function Stepper({ value, onChange, min = 1, max = 30, label, removable = false, size = 'md' }: StepperProps) {
  const atMin = value <= min;
  const showTrash = removable && value <= 1;
  return (
    <Root role="group" aria-label={label} data-size={size}>
      <IconButton
        type="button"
        data-size={size === 'sm' ? 'sm' : undefined}
        aria-label={showTrash ? 'Remover item' : 'Diminuir quantidade'}
        disabled={atMin && !removable}
        onClick={() => onChange(value - 1)}
      >
        {showTrash ? <Trash2 aria-hidden /> : <Minus aria-hidden />}
      </IconButton>
      <output aria-live="polite">{value}</output>
      <IconButton type="button" data-size={size === 'sm' ? 'sm' : undefined} aria-label="Aumentar quantidade" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus aria-hidden />
      </IconButton>
    </Root>
  );
}

const Root = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid ${c.lineStrong};
  border-radius: ${radius.md};
  background: ${c.surface};

  output {
    min-width: 32px;
    text-align: center;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &[data-size='sm'] output {
    min-width: 26px;
    font-size: 0.9375rem;
  }
`;
