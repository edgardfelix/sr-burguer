'use client';

import styled from 'styled-components';
import { describeStatus } from '@/lib/schedule';
import type { StoreStatus } from '@/lib/types';
import { c } from '@/styles/tokens';
import { Skeleton } from '../ui/Skeleton';

const Root = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 4px 10px 4px 8px;
  border-radius: 5px;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  background: ${c.redSoft};
  color: ${c.red};

  &[data-open='true'] {
    background: ${c.greenSoft};
    color: ${c.green};
  }

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    flex: none;
  }

  &[data-open='true'] i {
    box-shadow: 0 0 0 3px rgba(42, 111, 65, 0.18);
  }

  small {
    font-size: inherit;
    font-weight: 500;
    color: ${c.inkSoft};
  }
`;

/** Selo de aberto/fechado. Só aparece após a hidratação (depende do relógio do aparelho). */
export function StatusBadge({ status, now, ready, detail = true }: { status: StoreStatus; now: number; ready: boolean; detail?: boolean }) {
  if (!ready) return <Skeleton style={{ width: detail ? 200 : 96, height: 28 }} aria-hidden />;
  const text = describeStatus(status, now);
  return (
    <Root data-open={status.isOpen} role="status">
      <i aria-hidden />
      {text.title}
      {detail ? <small>{text.detail}</small> : null}
    </Root>
  );
}
