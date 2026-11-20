'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { sfx, unlockAudio } from '@/client/sound';
import { persistStorage, STORAGE_KEYS } from '@/client/storage';
import { IconButton } from '../ui/Button';

interface SoundState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: STORAGE_KEYS.sound, version: 1, storage: createJSONStorage(persistStorage), skipHydration: true },
  ),
);

export function useSound() {
  const enabled = useSoundStore((s) => s.enabled);
  const setEnabled = useSoundStore((s) => s.setEnabled);
  return { enabled, setEnabled };
}

export function SoundToggle() {
  const { enabled, setEnabled } = useSound();
  return (
    <IconButton
      type="button"
      data-size="sm"
      aria-pressed={enabled}
      aria-label={enabled ? 'Desligar sons do site' : 'Ligar sons do site'}
      title={enabled ? 'Sons ligados' : 'Sons desligados'}
      onClick={async () => {
        const next = !enabled;
        setEnabled(next);
        if (next) {
          await unlockAudio();
          sfx.tick();
        }
      }}
    >
      {enabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
    </IconButton>
  );
}
