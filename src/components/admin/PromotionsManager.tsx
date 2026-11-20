'use client';

import { Megaphone, Timer, Zap } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { toast } from 'sonner';
import { ApiError } from '@/client/api';
import { useNow } from '@/client/hooks';
import { isPromoActive, productsOf, PROMO_CATEGORY_ID, sortedCategories } from '@/lib/catalog';
import { formatBRL, parseBRL } from '@/lib/money';
import { computeStoreStatus, formatClock } from '@/lib/schedule';
import type { Product, StoreSettings } from '@/lib/types';
import { c, font, mq, radius } from '@/styles/tokens';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/Field';
import { Switch } from '../ui/Switch';
import { useAdmin } from './AdminData';
import { toSettingsPayload } from './settings-payload';

function remaining(endsAt: number, now: number): string {
  const minutes = Math.max(0, Math.round((endsAt - now) / 60_000));
  if (minutes < 60) return `termina em ${minutes} min (${formatClock(endsAt)})`;
  return `termina em ${Math.floor(minutes / 60)} h ${minutes % 60} min (${formatClock(endsAt)})`;
}

export function PromotionsManager() {
  const { catalog, settings, adminFetch, refresh, setSettingsLocal } = useAdmin();
  const now = useNow(0);
  const categories = sortedCategories(catalog);
  const all = categories.flatMap((cat) => productsOf(catalog, cat.id));
  const active = all.filter((p) => isPromoActive(p, now));
  const promoItems = productsOf(catalog, PROMO_CATEGORY_ID);

  const [productId, setProductId] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('120');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [launching, setLaunching] = useState(false);
  const [announcement, setAnnouncement] = useState(settings.announcement);
  const [savingNotice, setSavingNotice] = useState(false);

  const status = computeStoreStatus(settings, now);
  const minutesToClose = now && status.isOpen && status.closesAt ? Math.max(5, Math.round((status.closesAt - now) / 60_000)) : null;
  const selected = productId ? catalog.products[productId] : undefined;

  const launch = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const promoPrice = parseBRL(price);
    if (!selected) next.productId = 'Escolha o item da promoção';
    if (promoPrice === null || promoPrice <= 0) next.price = 'Informe o preço promocional, por exemplo 29,90';
    else if (selected && promoPrice >= selected.price) next.price = `Use um valor menor que ${formatBRL(selected.price)}`;
    setErrors(next);
    if (Object.keys(next).length || !selected || promoPrice === null) return;
    const durationMinutes = duration === 'none' ? null : duration === 'close' ? minutesToClose : Number(duration);
    setLaunching(true);
    try {
      await adminFetch(`/api/admin/catalog/products/${selected.id}/promo`, { method: 'PATCH', json: { promoPrice, durationMinutes } });
      toast.success(`Promoção no ar: ${selected.name} por ${formatBRL(promoPrice)}`);
      setProductId('');
      setPrice('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível lançar a promoção.');
    } finally {
      setLaunching(false);
    }
  };

  const end = async (product: Product) => {
    try {
      await adminFetch(`/api/admin/catalog/products/${product.id}/promo`, { method: 'PATCH', json: { promoPrice: null, durationMinutes: null } });
      toast.success(`Promoção de ${product.name} encerrada`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível encerrar.');
    }
  };

  const togglePromoItem = async (product: Product, available: boolean) => {
    try {
      await adminFetch(`/api/admin/catalog/products/${product.id}/availability`, { method: 'PATCH', json: { available } });
      toast.success(available ? `${product.name} no cardápio` : `${product.name} fora do cardápio`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível atualizar.');
    }
  };

  const saveNotice = async () => {
    setSavingNotice(true);
    try {
      const { settings: saved } = await adminFetch<{ settings: StoreSettings }>('/api/admin/settings', {
        method: 'PUT',
        json: { ...toSettingsPayload(settings), announcement },
      });
      setSettingsLocal(saved);
      toast.success(announcement.active ? 'Aviso publicado no cardápio' : 'Aviso salvo e oculto');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível salvar o aviso.');
    } finally {
      setSavingNotice(false);
    }
  };

  return (
    <Grid>
      <Panel>
        <PanelHead>
          <Zap aria-hidden />
          <div>
            <h2>Lançar promoção relâmpago</h2>
            <p>O site mostra o preço antigo riscado e encerra a promoção sozinho no horário escolhido.</p>
          </div>
        </PanelHead>
        <Form onSubmit={launch} noValidate>
          <SelectField label="Item" value={productId} error={errors.productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Escolha um item</option>
            {categories.map((cat) => (
              <optgroup key={cat.id} label={cat.name}>
                {productsOf(catalog, cat.id).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatBRL(p.price)})
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>
          <Two>
            <TextField
              label="Preço promocional"
              inputMode="decimal"
              placeholder={selected ? `Menor que ${formatBRL(selected.price)}` : '29,90'}
              value={price}
              error={errors.price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <SelectField label="Duração" value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="120">2 horas</option>
              <option value="180">3 horas</option>
              <option value="close" disabled={!minutesToClose}>
                Até fechar hoje{minutesToClose ? ` (${formatClock(status.closesAt as number)})` : ''}
              </option>
              <option value="1440">24 horas</option>
              <option value="none">Sem prazo (até encerrar)</option>
            </SelectField>
          </Two>
          <Button type="submit" data-loading={launching} disabled={launching}>
            <Zap aria-hidden /> Colocar promoção no ar
          </Button>
        </Form>
      </Panel>

      <Panel>
        <PanelHead>
          <Timer aria-hidden />
          <div>
            <h2>Promoções ativas</h2>
            <p>{active.length ? `${active.length} ${active.length === 1 ? 'item com preço promocional' : 'itens com preço promocional'} agora.` : 'Nenhuma promoção no ar.'}</p>
          </div>
        </PanelHead>
        {active.length ? (
          <List role="list">
            {active.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <span>
                    <s>{formatBRL(p.price)}</s> <b>{formatBRL(p.promoPrice as number)}</b> · {p.promoEndsAt ? remaining(p.promoEndsAt, now) : 'sem prazo'}
                  </span>
                </div>
                <Button type="button" data-size="sm" data-variant="secondary" onClick={() => void end(p)}>
                  Encerrar
                </Button>
              </li>
            ))}
          </List>
        ) : null}
      </Panel>

      <Panel>
        <PanelHead>
          <Megaphone aria-hidden />
          <div>
            <h2>Aviso no topo do cardápio</h2>
            <p>Uma linha curta com o que vale para hoje, por exemplo a promoção de sábado ou uma mudança de horário.</p>
          </div>
        </PanelHead>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            void saveNotice();
          }}
        >
          <TextField
            label="Texto do aviso"
            maxLength={140}
            placeholder="Ex.: Sábado tem lanche da promoção por R$ 9,99 a partir das 18h."
            value={announcement.text}
            hint={`${announcement.text.length}/140`}
            onChange={(e) => setAnnouncement((a) => ({ ...a, text: e.target.value }))}
          />
          <Switch showLabel label="Mostrar aviso no cardápio" checked={announcement.active} onChange={(v) => setAnnouncement((a) => ({ ...a, active: v }))} />
          <Button type="submit" data-variant="secondary" data-loading={savingNotice} disabled={savingNotice}>
            Salvar aviso
          </Button>
        </Form>
      </Panel>

      <Panel>
        <PanelHead>
          <Zap aria-hidden />
          <div>
            <h2>Itens da categoria Promoções</h2>
            <p>Ofertas fixas, como o lanche de R$ 9,99. Ligue no dia da promoção e desligue ao terminar.</p>
          </div>
        </PanelHead>
        {promoItems.length ? (
          <List role="list">
            {promoItems.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <span>{formatBRL(p.price)}</span>
                </div>
                <Switch label={`${p.name} no cardápio`} checked={p.available} onChange={(v) => void togglePromoItem(p, v)} />
              </li>
            ))}
          </List>
        ) : (
          <p>Nenhum item na categoria Promoções. Crie em Cardápio.</p>
        )}
      </Panel>
    </Grid>
  );
}

const Grid = styled.div`
  display: grid;
  gap: 16px;
  align-items: start;

  ${mq.lg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Panel = styled.section`
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid ${c.line};
  border-radius: ${radius.lg};
  background: ${c.surface};

  > p {
    color: ${c.muted};
  }
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

const Form = styled.form`
  display: grid;
  gap: 14px;
  justify-items: stretch;

  > button {
    justify-self: start;
  }
`;

const Two = styled.div`
  display: grid;
  gap: 12px;

  ${mq.sm} {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
`;

const List = styled.ul`
  display: grid;
  margin: 0;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid ${c.line};
  }

  li:last-of-type {
    border-bottom: 0;
  }

  div {
    display: grid;
    gap: 2px;
  }

  span {
    font-size: 0.875rem;
    color: ${c.muted};
    font-variant-numeric: tabular-nums;
  }

  b {
    color: ${c.red};
  }
`;
