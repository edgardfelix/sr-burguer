'use client';

import { Bell, Clock3, MapPin, Store, Truck } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import { toast } from 'sonner';
import { ApiError } from '@/client/api';
import { useNow } from '@/client/hooks';
import { centsToInput, parseBRL } from '@/lib/money';
import { computeStoreStatus, describeStatus, WEEK_ORDER, WEEKDAY_NAMES } from '@/lib/schedule';
import { settingsInputSchema } from '@/lib/schemas';
import type { StoreMode, StoreSettings, Weekday } from '@/lib/types';
import { formatPhone } from '@/lib/whatsapp';
import { c, font, mq, radius } from '@/styles/tokens';
import { Button } from '../ui/Button';
import { ErrorText, Segmented, TextField } from '../ui/Field';
import { Switch } from '../ui/Switch';
import { useAdmin } from './AdminData';
import { ImageField } from './ImageField';
import { toSettingsPayload } from './settings-payload';

interface Draft {
  settings: StoreSettings;
  deliveryFee: string;
  combineFee: boolean;
  minOrder: string;
}

function toDraft(settings: StoreSettings): Draft {
  return {
    settings: { ...settings, whatsapp: settings.whatsapp ? formatPhone(settings.whatsapp) : '' },
    deliveryFee: centsToInput(settings.deliveryFee),
    combineFee: settings.deliveryFee === null,
    minOrder: settings.minOrder ? centsToInput(settings.minOrder) : '',
  };
}

export function StoreSettingsForm() {
  const { settings, adminFetch, setSettingsLocal } = useAdmin();
  const now = useNow(0);
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const s = draft.settings;
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(settings));

  const update = (patch: Partial<StoreSettings>) => setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const updateDay = (day: Weekday, patch: Partial<StoreSettings['hours'][Weekday]>) =>
    update({ hours: { ...s.hours, [day]: { ...s.hours[day], ...patch } } });

  const status = computeStoreStatus(s, now);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const fee = draft.combineFee ? null : parseBRL(draft.deliveryFee);
    const minOrder = draft.minOrder.trim() ? parseBRL(draft.minOrder) : 0;
    const next: Record<string, string> = {};
    if (!draft.combineFee && fee === null) next.deliveryFee = 'Informe a taxa, por exemplo 5,00, ou marque "Combinar pelo WhatsApp"';
    if (minOrder === null) next.minOrder = 'Valor inválido';
    const parsed = settingsInputSchema.safeParse({ ...toSettingsPayload(s), deliveryFee: fee, minOrder: minOrder ?? 0 });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!next[key]) next[key] = issue.message;
      }
    }
    if (!s.acceptsDelivery && !s.acceptsPickup) next.modes = 'Mantenha entrega ou retirada ligada';
    setErrors(next);
    if (Object.keys(next).length || !parsed.success) {
      toast.error('Confira os campos destacados.');
      return;
    }
    setSaving(true);
    try {
      const { settings: saved } = await adminFetch<{ settings: StoreSettings }>('/api/admin/settings', { method: 'PUT', json: parsed.data });
      setSettingsLocal(saved);
      setDraft(toDraft(saved));
      toast.success('Configurações salvas. O cardápio público já foi atualizado.');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form onSubmit={submit} noValidate>
      <Section icon={<Clock3 aria-hidden />} title="Funcionamento" text="O modo Automático abre e fecha os pedidos pelo horário abaixo.">
        <Segmented<StoreMode>
          name="mode"
          ariaLabel="Modo da loja"
          value={s.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: 'auto', label: 'Automático' },
            { value: 'open', label: 'Sempre aberta' },
            { value: 'closed', label: 'Fechada' },
          ]}
        />
        {now ? (
          <Current data-open={status.isOpen}>
            Com estas configurações: <b>{describeStatus(status, now).title}</b>. {describeStatus(status, now).detail}.
          </Current>
        ) : null}
        <Hours role="list" aria-label="Horário por dia">
          {WEEK_ORDER.map((day) => {
            const h = s.hours[day];
            return (
              <li key={day} data-off={!h.enabled}>
                <Switch showLabel label={WEEKDAY_NAMES[day].charAt(0).toUpperCase() + WEEKDAY_NAMES[day].slice(1)} checked={h.enabled} onChange={(v) => updateDay(day, { enabled: v })} />
                <TimeInput aria-label={`Abertura de ${WEEKDAY_NAMES[day]}`} type="time" value={h.open} disabled={!h.enabled} onChange={(e) => updateDay(day, { open: e.target.value })} />
                <span>às</span>
                <TimeInput aria-label={`Fechamento de ${WEEKDAY_NAMES[day]}`} type="time" value={h.close} disabled={!h.enabled} onChange={(e) => updateDay(day, { close: e.target.value })} />
                {errors[`hours.${day}.close`] ? <ErrorText>{errors[`hours.${day}.close`]}</ErrorText> : null}
              </li>
            );
          })}
        </Hours>
        <Small>Fechamento antes da abertura (ex.: 18:00 às 02:00) vale como expediente que passa da meia-noite.</Small>
      </Section>

      <Section icon={<Store aria-hidden />} title="Perfil da loja" text="Dados exibidos no cardápio, no rodapé e no resumo de pedido do WhatsApp.">
        <Two>
          <TextField label="Nome da loja" value={s.name} error={errors.name} maxLength={60} onChange={(e) => update({ name: e.target.value })} />
          <TextField label="Frase curta" value={s.tagline} error={errors.tagline} maxLength={80} onChange={(e) => update({ tagline: e.target.value })} />
        </Two>
        <ImageField label="Logo" round value={s.logo ?? null} maxSize={512} hint="Opcional. Sem logo enviado, o site usa o logo atual da marca." onChange={(url) => update({ logo: url })} />
        <Two>
          <TextField
            label="WhatsApp da loja"
            type="tel"
            inputMode="tel"
            placeholder="(11) 98765-4321"
            value={s.whatsapp}
            error={errors.whatsapp}
            hint="Recebe o resumo que o cliente envia ao concluir o pedido."
            onChange={(e) => update({ whatsapp: formatPhone(e.target.value) })}
          />
          <TextField label="Chave Pix" value={s.pixKey} error={errors.pixKey} maxLength={120} hint="Mostrada ao cliente que escolhe Pix." onChange={(e) => update({ pixKey: e.target.value })} />
        </Two>
        <Two>
          <TextField label="Instagram" placeholder="sr_burguer_01" value={s.instagram} error={errors.instagram} onChange={(e) => update({ instagram: e.target.value })} />
          <TextField label="Link do iFood" optional type="url" placeholder="https://www.ifood.com.br/..." value={s.ifoodUrl} error={errors.ifoodUrl} onChange={(e) => update({ ifoodUrl: e.target.value })} />
        </Two>
      </Section>

      <Section icon={<Truck aria-hidden />} title="Entrega e retirada" text="Taxa, pedido mínimo e tempo estimado aparecem no carrinho e na confirmação.">
        <Toggles>
          <Switch showLabel label="Aceitar pedidos para entrega" checked={s.acceptsDelivery} onChange={(v) => update({ acceptsDelivery: v })} />
          <Switch showLabel label="Aceitar retirada no balcão" checked={s.acceptsPickup} onChange={(v) => update({ acceptsPickup: v })} />
          {errors.modes ? <ErrorText>{errors.modes}</ErrorText> : null}
        </Toggles>
        <Two>
          <div>
            <TextField
              label="Taxa de entrega"
              inputMode="decimal"
              placeholder="5,00"
              value={draft.deliveryFee}
              disabled={draft.combineFee}
              error={errors.deliveryFee}
              onChange={(e) => setDraft((d) => ({ ...d, deliveryFee: e.target.value }))}
            />
            <Check>
              <input type="checkbox" checked={draft.combineFee} onChange={(e) => setDraft((d) => ({ ...d, combineFee: e.target.checked }))} />
              Combinar pelo WhatsApp
            </Check>
          </div>
          <TextField
            label="Pedido mínimo para entrega"
            optional
            inputMode="decimal"
            placeholder="Sem mínimo"
            value={draft.minOrder}
            error={errors.minOrder}
            onChange={(e) => setDraft((d) => ({ ...d, minOrder: e.target.value }))}
          />
        </Two>
        <TextField label="Tempo estimado" optional placeholder="Ex.: 40 a 60 min" value={s.etaText} error={errors.etaText} maxLength={40} onChange={(e) => update({ etaText: e.target.value })} />
      </Section>

      <Section icon={<MapPin aria-hidden />} title="Endereço" text="Usado no cardápio, no Google (dados estruturados) e na retirada. Só delivery, sem balcão: deixe rua, número e bairro vazios.">
        <Two>
          <TextField label="Rua" value={s.address.street} error={errors['address.street']} onChange={(e) => update({ address: { ...s.address, street: e.target.value } })} />
          <TextField label="Número" value={s.address.number} error={errors['address.number']} onChange={(e) => update({ address: { ...s.address, number: e.target.value } })} />
        </Two>
        <Three>
          <TextField label="Bairro" value={s.address.district} error={errors['address.district']} onChange={(e) => update({ address: { ...s.address, district: e.target.value } })} />
          <TextField label="Cidade" value={s.address.city} error={errors['address.city']} onChange={(e) => update({ address: { ...s.address, city: e.target.value } })} />
          <TextField label="UF" value={s.address.state} maxLength={2} error={errors['address.state']} onChange={(e) => update({ address: { ...s.address, state: e.target.value.toUpperCase() } })} />
        </Three>
      </Section>

      <Section icon={<Bell aria-hidden />} title="Alertas do painel" text="Como o painel avisa sobre pedidos novos.">
        <Switch showLabel label="Repetir a campainha a cada 30 s enquanto houver pedido sem aceite" checked={s.repeatAlert} onChange={(v) => update({ repeatAlert: v })} />
      </Section>

      <SaveBar data-visible={dirty}>
        <p>Você tem alterações não salvas.</p>
        <Button type="button" data-variant="ghost" data-size="sm" onClick={() => setDraft(toDraft(settings))}>
          Descartar
        </Button>
        <Button type="submit" data-size="sm" data-loading={saving} disabled={saving || !dirty}>
          Salvar alterações
        </Button>
      </SaveBar>
    </Form>
  );
}

function Section({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <Panel>
      <PanelHead>
        {icon}
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      </PanelHead>
      {children}
    </Panel>
  );
}

const Form = styled.form`
  display: grid;
  gap: 16px;
  max-width: 920px;
  padding-bottom: 80px;
`;

const Panel = styled.section`
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid ${c.line};
  border-radius: ${radius.lg};
  background: ${c.surface};
`;

const PanelHead = styled.div`
  display: flex;
  gap: 12px;

  > svg {
    flex: none;
    width: 36px;
    height: 36px;
    padding: 8px;
    border-radius: ${radius.md};
    background: ${c.ink};
    color: ${c.amber};
  }

  h2 {
    font-family: ${font.display};
    font-size: 1.25rem;
  }

  p {
    font-size: 0.9375rem;
    color: ${c.muted};
  }
`;

const Current = styled.p`
  padding: 10px 12px;
  border-radius: ${radius.md};
  background: ${c.redSoft};
  font-size: 0.9375rem;

  &[data-open='true'] {
    background: ${c.greenSoft};
  }
`;

const Hours = styled.ul`
  display: grid;
  margin: 0;
  padding: 0;

  li {
    display: grid;
    grid-template-columns: 150px 128px auto 128px;
    justify-content: start;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid ${c.line};
  }

  li:last-of-type {
    border-bottom: 0;
  }

  li > span {
    color: ${c.muted};
    font-size: 0.875rem;
  }

  li p {
    grid-column: 1 / -1;
  }

  li[data-off='true'] input[type='time'] {
    opacity: 0.4;
  }
`;

const TimeInput = styled.input`
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid ${c.lineStrong};
  border-radius: ${radius.md};
  background: ${c.surface};
  font-variant-numeric: tabular-nums;
`;

const Small = styled.p`
  font-size: 0.8125rem;
  color: ${c.muted};
`;

const Two = styled.div`
  display: grid;
  gap: 12px;

  ${mq.sm} {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
`;

const Three = styled.div`
  display: grid;
  gap: 12px;

  ${mq.sm} {
    grid-template-columns: 1.4fr 1.4fr 0.5fr;
    align-items: start;
  }
`;

const Toggles = styled.div`
  display: grid;
  gap: 14px;
`;

const Check = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.9375rem;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    accent-color: ${c.ink};
  }
`;

const SaveBar = styled.div`
  position: sticky;
  bottom: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 16px;
  border-radius: ${radius.lg};
  background: ${c.ink};
  color: ${c.cream};
  box-shadow: 0 16px 40px -16px rgba(23, 17, 13, 0.6);
  transform: translateY(16px);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 240ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 200ms ease;

  &[data-visible='true'] {
    transform: none;
    opacity: 1;
    pointer-events: auto;
  }

  p {
    flex: 1;
    font-size: 0.9375rem;
  }

  button[data-variant='ghost'] {
    color: ${c.cream};
  }
`;
