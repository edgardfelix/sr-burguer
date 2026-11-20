'use client';

import { ImagePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'sonner';
import { ApiError } from '@/client/api';
import { resizeImageToDataUrl } from '@/client/image-resize';
import { c, radius } from '@/styles/tokens';
import { Button } from '../ui/Button';
import { Hint, Label } from '../ui/Field';
import { useAdmin } from './AdminData';

interface ImageFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
  maxSize?: number;
  round?: boolean;
}

/** Envio de foto: reduz no navegador, grava no banco e devolve a URL /api/media/:id. */
export function ImageField({ label, value, onChange, hint, maxSize = 900, round = false }: ImageFieldProps) {
  const { adminFetch } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, maxSize);
      const { url } = await adminFetch<{ url: string }>('/api/admin/media', { method: 'POST', json: { dataUrl } });
      onChange(url);
      toast.success('Imagem enviada');
    } catch (error) {
      toast.error(error instanceof ApiError || error instanceof Error ? error.message : 'Falha ao enviar a imagem.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Wrap>
      <Label htmlFor={id}>{label}</Label>
      <Row>
        <Preview data-round={round}>
          {value ? (
            <Image src={value} alt="" fill sizes="96px" unoptimized={value.startsWith('/api/media/')} style={{ objectFit: round ? 'cover' : 'contain' }} />
          ) : (
            <ImagePlus aria-hidden />
          )}
        </Preview>
        <div>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            hidden
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Buttons>
            <Button type="button" data-size="sm" data-variant="secondary" data-loading={busy} disabled={busy} onClick={() => inputRef.current?.click()}>
              <ImagePlus aria-hidden /> {value ? 'Trocar imagem' : 'Enviar imagem'}
            </Button>
            {value ? (
              <Button type="button" data-size="sm" data-variant="ghost" onClick={() => onChange(null)}>
                <Trash2 aria-hidden /> Remover
              </Button>
            ) : null}
          </Buttons>
          {hint ? <Hint>{hint}</Hint> : null}
        </div>
      </Row>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
`;

const Preview = styled.div`
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 96px;
  height: 72px;
  overflow: hidden;
  border: 1px dashed ${c.lineStrong};
  border-radius: ${radius.md};
  background: ${c.paper2};
  color: ${c.muted};

  &[data-round='true'] {
    width: 72px;
    border-radius: 50%;
  }

  svg {
    width: 22px;
    height: 22px;
  }
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
`;
