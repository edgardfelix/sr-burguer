'use client';

import { CupSoda } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { toast } from 'sonner';
import { ApiError } from '@/client/api';
import { comboDrinkOptions, isComboCategory, sortedCategories } from '@/lib/catalog';
import { centsToInput, parseBRL } from '@/lib/money';
import { productInputSchema } from '@/lib/schemas';
import type { Category, DrinkChoiceMode, Product } from '@/lib/types';
import { c, mq, radius } from '@/styles/tokens';
import { Button } from '../ui/Button';
import { Segmented, SelectField, TextAreaField, TextField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { Switch } from '../ui/Switch';
import { useAdmin } from './AdminData';
import { ImageField } from './ImageField';

const isDrinkCategory = (category: Category | undefined) => Boolean(category && (category.id === 'bebidas' || /bebida|refri|suco|drink|[áa]gua/i.test(category.name)));

const DRINK_CHOICE_OPTIONS: { value: DrinkChoiceMode; label: string }[] = [
  { value: 'none', label: 'Não pedir' },
  { value: 'optional', label: 'Opcional' },
  { value: 'required', label: 'Obrigatória' },
];

interface ProductFormProps {
  product: Product | null;
  defaultCategoryId: string;
  open: boolean;
  onClose: () => void;
}

export function ProductForm({ product, defaultCategoryId, open, onClose }: ProductFormProps) {
  const { catalog, adminFetch, refresh } = useAdmin();
  const categories = sortedCategories(catalog);
  const [draft, setDraft] = useState(() => {
    const categoryId = product?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '';
    return {
      categoryId,
      name: product?.name ?? '',
      description: product?.description ?? '',
      price: centsToInput(product?.price),
      promoPrice: centsToInput(product?.promoPrice ?? null),
      image: product?.image ?? null,
      imageAlt: product?.imageAlt ?? '',
      imageContain: product?.imageContain ?? false,
      available: product?.available ?? true,
      featured: product?.featured ?? false,
      // Item novo em Combos já nasce pedindo a bebida.
      drinkChoice: product?.drinkChoice ?? ((isComboCategory(catalog.categories[categoryId]) ? 'required' : 'none') as DrinkChoiceMode),
      comboDrink: product?.comboDrink ?? false,
    };
  });
  const [drinkTouched, setDrinkTouched] = useState(Boolean(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  // Item novo mudando de categoria: a escolha de bebida acompanha (até a pessoa mexer nela).
  const changeCategory = (categoryId: string) => {
    setDraft((d) => ({
      ...d,
      categoryId,
      ...(drinkTouched ? {} : { drinkChoice: (isComboCategory(catalog.categories[categoryId]) ? 'required' : 'none') as DrinkChoiceMode }),
    }));
    setErrors((e) => ({ ...e, categoryId: '' }));
  };

  const category = catalog.categories[draft.categoryId];
  const showDrinkChoice = isComboCategory(category) || draft.drinkChoice !== 'none';
  const showComboDrink = isDrinkCategory(category) || draft.comboDrink;
  const drinkOptions = comboDrinkOptions(catalog).filter((p) => p.id !== product?.id);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const price = parseBRL(draft.price);
    const promoPrice = draft.promoPrice.trim() ? parseBRL(draft.promoPrice) : null;
    const keepEnds = product && product.promoPrice === promoPrice ? (product.promoEndsAt ?? null) : null;
    const input = {
      categoryId: draft.categoryId,
      name: draft.name,
      description: draft.description,
      price: price ?? -1,
      promoPrice,
      promoEndsAt: promoPrice ? keepEnds : null,
      image: draft.image,
      imageAlt: draft.imageAlt,
      imageContain: draft.imageContain,
      available: draft.available,
      featured: draft.featured,
      drinkChoice: draft.drinkChoice,
      comboDrink: draft.comboDrink,
      ...(product ? { order: product.order } : {}),
    };
    const parsed = productInputSchema.safeParse(input);
    const next: Record<string, string> = {};
    if (price === null) next.price = 'Informe o preço, por exemplo 34,90';
    if (draft.promoPrice.trim() && promoPrice === null) next.promoPrice = 'Valor inválido';
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key && !next[key]) next[key] = key === 'price' ? 'Informe o preço, por exemplo 34,90' : issue.message;
      }
    }
    if (Object.keys(next).length || !parsed.success) {
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      if (product) await adminFetch(`/api/admin/catalog/products/${product.id}`, { method: 'PUT', json: parsed.data });
      else await adminFetch('/api/admin/catalog/products', { method: 'POST', json: parsed.data });
      toast.success(product ? 'Item atualizado no cardápio' : 'Item adicionado ao cardápio');
      await refresh();
      onClose();
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
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={product ? 'Editar item' : 'Novo item'}
      footer={
        <Footer>
          <Button type="button" data-variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-produto" data-loading={saving} disabled={saving}>
            {product ? 'Salvar alterações' : 'Adicionar item'}
          </Button>
        </Footer>
      }
    >
      <Form id="form-produto" onSubmit={submit} noValidate>
        <TextField label="Nome" value={draft.name} error={errors.name} maxLength={80} onChange={(e) => set('name', e.target.value)} />
        <SelectField label="Categoria" value={draft.categoryId} error={errors.categoryId} onChange={(e) => changeCategory(e.target.value)}>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Descrição"
          rows={3}
          maxLength={300}
          value={draft.description}
          error={errors.description}
          hint="Ingredientes e tamanho, em uma ou duas frases."
          onChange={(e) => set('description', e.target.value)}
        />
        <Two>
          <TextField label="Preço" inputMode="decimal" placeholder="34,90" value={draft.price} error={errors.price} onChange={(e) => set('price', e.target.value)} />
          <TextField
            label="Preço promocional"
            optional
            inputMode="decimal"
            placeholder="29,90"
            value={draft.promoPrice}
            error={errors.promoPrice}
            hint="Para promoção com hora de término, use Promoções."
            onChange={(e) => set('promoPrice', e.target.value)}
          />
        </Two>
        <ImageField
          label="Foto"
          value={draft.image}
          onChange={(url) => set('image', url)}
          hint="JPG, PNG ou WebP. A foto é reduzida antes do envio."
        />
        <TextField
          label="Descrição da foto"
          optional
          maxLength={140}
          value={draft.imageAlt}
          hint="Lida por leitores de tela e pelo Google. Ex.: SR Salad Bacon com cheddar, alface e tomate."
          onChange={(e) => set('imageAlt', e.target.value)}
        />
        {showDrinkChoice ? (
          <DrinkBox role="group" aria-labelledby="titulo-bebida-combo">
            <p id="titulo-bebida-combo">
              <CupSoda aria-hidden /> Escolha de bebida
            </p>
            <Segmented<DrinkChoiceMode>
              name="drinkChoice"
              ariaLabel="Escolha de bebida pelo cliente"
              value={draft.drinkChoice}
              onChange={(v) => {
                setDrinkTouched(true);
                set('drinkChoice', v);
              }}
              options={DRINK_CHOICE_OPTIONS}
            />
            {draft.drinkChoice === 'none' ? (
              <small>O cliente adiciona o item direto, sem escolher bebida.</small>
            ) : drinkOptions.length ? (
              <small>
                Opções de agora ({drinkOptions.length}): {drinkOptions.map((d) => d.name).join(', ')}. Para mudar a lista, ligue ou desligue
                &quot;Oferecer como bebida dos combos&quot; em cada bebida. Bebida pausada some da escolha sozinha.
              </small>
            ) : (
              <small data-tone="warn">
                Nenhuma bebida está marcada como opção dos combos. Enquanto não houver opção disponível, o item é vendido sem a pergunta.
              </small>
            )}
          </DrinkBox>
        ) : null}
        <Toggles>
          <Switch showLabel label="Foto com fundo transparente (ex.: latas)" checked={draft.imageContain} onChange={(v) => set('imageContain', v)} />
          <Switch showLabel label="Disponível no cardápio" checked={draft.available} onChange={(v) => set('available', v)} />
          <Switch showLabel label="Marcar como destaque" checked={draft.featured} onChange={(v) => set('featured', v)} />
          {showComboDrink ? (
            <Switch showLabel label="Oferecer como bebida dos combos" checked={draft.comboDrink} onChange={(v) => set('comboDrink', v)} />
          ) : null}
        </Toggles>
      </Form>
    </Sheet>
  );
}

const Form = styled.form`
  display: grid;
  gap: 18px;
`;

const Two = styled.div`
  display: grid;
  gap: 12px;

  ${mq.sm} {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
`;

const DrinkBox = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid ${c.line};
  border-radius: ${radius.md};

  > p {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;

    svg {
      width: 18px;
      height: 18px;
      color: ${c.amberInk};
    }
  }

  small {
    font-size: 0.8125rem;
    line-height: 1.45;
    color: ${c.muted};
  }
  small[data-tone='warn'] {
    color: ${c.red};
    font-weight: 600;
  }
`;

const Toggles = styled.div`
  display: grid;
  gap: 14px;
  padding: 14px;
  border-radius: 8px;
  background: ${c.paper2};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;
