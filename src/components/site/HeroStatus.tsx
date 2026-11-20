'use client';

import { StatusBadge } from './StatusBadge';
import { useStore } from './StoreProvider';

export function HeroStatus() {
  const { status, now, ready } = useStore();
  return <StatusBadge status={status} now={now} ready={ready} />;
}
