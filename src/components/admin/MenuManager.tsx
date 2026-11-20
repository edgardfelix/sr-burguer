'use client';

import { ArrowDown, ArrowUp, ImageOff, Pencil, Plus, RotateCcw, Search, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'sonner';
import { ApiError } from '@/client/api';
import { useNow } from '@/client/hooks';
import { isPromoActive, productsOf, sortedCategories } from '@/lib/catalog';
import { formatBRL } from '@/lib/money';
import type { Category, Product } from '@/lib/types';
import { c, font, mq, radius } from '@/styles/tokens';
import { Button, IconButton } from '../ui/Button';
import { Input } from '../ui/Field';
import { Switch } from '../ui/Switch';
import { useAdmin } from './AdminData';
import { CategoryForm } from './CategoryForm';
import { ProductForm } from './ProductForm';

type ProductEditor = { product: Product | null; key: number; open: boolean } | null;
type CategoryEditor = { category: Category | null; key: number; open: boolean } | null;

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function MenuManager() {
  const { catalog, adminFetch, refresh } = useAdmin();
  const categories = sortedCategories(catalog);
  const [selected, setSelected] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [productEditor, setProductEditor] = useState<ProductEditor>(null);
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditor>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const now = useNow(0);

  const products = useMemo(() => {
    const q = normalizeText(query.trim());
    const base = selected === 'all' ? categories.flatMap((cat) => productsOf(catalog, cat.id)) : productsOf(catalog, selected);
    return q ? base.filter((p) => normalizeText(`${p.name} ${p.description}`).includes(q)) : base;
  }, [catalog, categories, query, selected]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível concluir.');
    }
  };

  const toggleAvailable = (product: Product, available: boolean) =>
    run(
      () => adminFetch(`/api/admin/catalog/products/${product.id}/availability`, { method: 'PATCH', json: { available } }),
      available ? `${product.name} voltou ao cardápio` : `${product.name} pausado`,
    );

  const toggleFeatured = (product: Product) =>
    run(
      () =>
        adminFetch(`/api/admin/catalog/products/${product.id}`, {
          method: 'PUT',
          json: {
            categoryId: product.categoryId,
            name: product.name,
            description: product.description,
            price: product.price,
            promoPrice: product.promoPrice ?? null,
            promoEndsAt: product.promoEndsAt ?? null,
            image: product.image ?? null,
            imageAlt: product.imageAlt ?? '',
            imageContain: product.imageContain ?? false,
            available: product.available,
            featured: !product.featured,
            order: product.order,
          },
        }),
      product.featured ? 'Destaque removido' : 'Item marcado como destaque',
    );

  const move = (product: Product, delta: number) => {
    const siblings = productsOf(catalog, product.categoryId);
    const index = siblings.findIndex((p) => p.id === product.id);
    const target = index + delta;
    if (target < 0 || target >= siblings.length) return;
    const ids = siblings.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
    void run(() => adminFetch('/api/admin/catalog/products/reorder', { method: 'POST', json: { ids } }), 'Ordem atualizada');
  };

  const moveCategory = (category: Category, delta: number) => {
    const ids = categories.map((cat) => cat.id);
    const index = ids.indexOf(category.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
    void run(() => adminFetch('/api/admin/catalog/categories/reorder', { method: 'POST', json: { ids } }), 'Ordem das categorias atualizada');
  };

  const remove = (product: Product) => {
    if (confirmId !== product.id) {
      setConfirmId(product.id);
      window.setTimeout(() => setConfirmId((id) => (id === product.id ? null : id)), 4000);
      return;
    }
    setConfirmId(null);
    void run(() => adminFetch(`/api/admin/catalog/products/${product.id}`, { method: 'DELETE' }), `${product.name} excluído`);
  };

  const restore = () => {
    if (!confirmRestore) {
      setConfirmRestore(true);
      window.setTimeout(() => setConfirmRestore(false), 5000);
      return;
    }
    setConfirmRestore(false);
    void run(() => adminFetch('/api/admin/catalog/restore-seed', { method: 'POST', json: { confirm: true } }), 'Cardápio inicial restaurado');
  };

  const categoryName = (id: string) => catalog.categories[id]?.name ?? 'Sem categoria';

  // Fecha pelo ciclo normal do Radix (open=false) e só desmonta depois da animação de saída.
  const closeProductEditor = () => {
    setProductEditor((e) => (e ? { ...e, open: false } : e));
    window.setTimeout(() => setProductEditor((e) => (e && !e.open ? null : e)), 360);
  };
  const closeCategoryEditor = () => {
    setCategoryEditor((e) => (e ? { ...e, open: false } : e));
    window.setTimeout(() => setCategoryEditor((e) => (e && !e.open ? null : e)), 360);
  };

  return (
    <Wrap>
      <Toolbar>
        <SearchBox>
          <Search aria-hidden />
          <Input type="search" placeholder="Buscar item pelo nome ou ingrediente" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar item" />
        </SearchBox>
        <Button type="button" onClick={() => setProductEditor({ product: null, key: Date.now(), open: true })}>
          <Plus aria-hidden /> Novo item
        </Button>
      </Toolbar>

      <Layout>
        <Categories aria-label="Categorias">
          <CatHead>
            <h2>Categorias</h2>
            <IconButton type="button" data-size="sm" aria-label="Nova categoria" title="Nova categoria" onClick={() => setCategoryEditor({ category: null, key: Date.now(), open: true })}>
              <Plus aria-hidden />
            </IconButton>
          </CatHead>
          <CatList role="list">
            <li>
              <CatButton type="button" aria-pressed={selected === 'all'} onClick={() => setSelected('all')}>
                Todos os itens <span>{Object.keys(catalog.products).length}</span>
              </CatButton>
            </li>
            {categories.map((cat, index) => (
              <li key={cat.id}>
                <CatButton type="button" aria-pressed={selected === cat.id} data-inactive={!cat.active} onClick={() => setSelected(cat.id)}>
                  {cat.name}
                  {!cat.active ? <em>oculta</em> : null}
                  <span>{productsOf(catalog, cat.id).length}</span>
                </CatButton>
                <CatTools>
                  <IconButton type="button" data-size="sm" aria-label={`Subir ${cat.name}`} disabled={index === 0} onClick={() => moveCategory(cat, -1)}>
                    <ArrowUp aria-hidden />
                  </IconButton>
                  <IconButton type="button" data-size="sm" aria-label={`Descer ${cat.name}`} disabled={index === categories.length - 1} onClick={() => moveCategory(cat, 1)}>
                    <ArrowDown aria-hidden />
                  </IconButton>
                  <IconButton type="button" data-size="sm" aria-label={`Editar ${cat.name}`} onClick={() => setCategoryEditor({ category: cat, key: Date.now(), open: true })}>
                    <Pencil aria-hidden />
                  </IconButton>
                </CatTools>
              </li>
            ))}
          </CatList>
        </Categories>

        <Products aria-label="Itens do cardápio">
          {products.length === 0 ? (
            <Empty>{query ? 'Nenhum item encontrado para esta busca.' : 'Nenhum item nesta categoria ainda.'}</Empty>
          ) : (
            <Table role="list">
              {products.map((product) => {
                const siblings = productsOf(catalog, product.categoryId);
                const position = siblings.findIndex((p) => p.id === product.id);
                const promo = isPromoActive(product, now);
                return (
                  <Row key={product.id} data-off={!product.available}>
                    <Thumb data-contain={product.imageContain || undefined}>
                      {product.image ? (
                        <Image src={product.image} alt="" fill sizes="64px" unoptimized={product.image.startsWith('/api/media/')} />
                      ) : (
                        <ImageOff aria-hidden />
                      )}
                    </Thumb>
                    <Info>
                      <strong>
                        {product.name}
                        {product.featured ? <Tag>Destaque</Tag> : null}
                        {promo ? <Tag data-tone="promo">Promoção</Tag> : null}
                        {product.drinkChoice !== 'none' ? <Tag>{product.drinkChoice === 'required' ? 'Pede bebida' : 'Bebida opcional'}</Tag> : null}
                        {product.comboDrink ? <Tag>Bebida dos combos</Tag> : null}
                      </strong>
                      <span>
                        {selected === 'all' ? `${categoryName(product.categoryId)} · ` : ''}
                        {product.description || 'Sem descrição'}
                      </span>
                    </Info>
                    <Price>
                      {promo ? (
                        <>
                          <s>{formatBRL(product.price)}</s>
                          <b>{formatBRL(product.promoPrice as number)}</b>
                        </>
                      ) : (
                        <b>{formatBRL(product.price)}</b>
                      )}
                    </Price>
                    <Switch label={`${product.name} disponível`} checked={product.available} onChange={(v) => void toggleAvailable(product, v)} />
                    <Tools>
                      <IconButton type="button" data-size="sm" aria-label={product.featured ? `Remover destaque de ${product.name}` : `Destacar ${product.name}`} aria-pressed={product.featured} onClick={() => void toggleFeatured(product)}>
                        <Star aria-hidden fill={product.featured ? 'currentColor' : 'none'} />
                      </IconButton>
                      <IconButton type="button" data-size="sm" aria-label={`Subir ${product.name}`} disabled={position <= 0} onClick={() => move(product, -1)}>
                        <ArrowUp aria-hidden />
                      </IconButton>
                      <IconButton type="button" data-size="sm" aria-label={`Descer ${product.name}`} disabled={position >= siblings.length - 1} onClick={() => move(product, 1)}>
                        <ArrowDown aria-hidden />
                      </IconButton>
                      <IconButton type="button" data-size="sm" aria-label={`Editar ${product.name}`} onClick={() => setProductEditor({ product, key: Date.now(), open: true })}>
                        <Pencil aria-hidden />
                      </IconButton>
                      {confirmId === product.id ? (
                        <Button type="button" data-size="sm" data-variant="danger" onClick={() => remove(product)}>
                          Excluir
                        </Button>
                      ) : (
                        <IconButton type="button" data-size="sm" aria-label={`Excluir ${product.name}`} onClick={() => remove(product)}>
                          <Trash2 aria-hidden />
                        </IconButton>
                      )}
                    </Tools>
                  </Row>
                );
              })}
            </Table>
          )}

          <Danger>
            <div>
              <h2>Restaurar cardápio inicial</h2>
              <p>Volta todos os itens, preços e categorias para o cardápio importado do iFood. Use só se o cardápio ficar bagunçado.</p>
            </div>
            <Button type="button" data-size="sm" data-variant={confirmRestore ? 'danger' : 'secondary'} onClick={restore}>
              <RotateCcw aria-hidden /> {confirmRestore ? 'Confirmar restauração' : 'Restaurar'}
            </Button>
          </Danger>
        </Products>
      </Layout>

      {productEditor ? (
        <ProductForm
          key={productEditor.key}
          product={productEditor.product}
          defaultCategoryId={selected !== 'all' ? selected : (categories[0]?.id ?? '')}
          open={productEditor.open}
          onClose={closeProductEditor}
        />
      ) : null}
      {categoryEditor ? <CategoryForm key={categoryEditor.key} category={categoryEditor.category} open={categoryEditor.open} onClose={closeCategoryEditor} /> : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: 16px;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
`;

const SearchBox = styled.label`
  position: relative;
  flex: 1;
  min-width: 260px;
  max-width: 480px;

  svg {
    position: absolute;
    left: 14px;
    top: 50%;
    width: 18px;
    height: 18px;
    transform: translateY(-50%);
    color: ${c.muted};
    pointer-events: none;
  }

  input {
    padding-left: 42px;
  }
`;

const Layout = styled.div`
  display: grid;
  gap: 16px;
  align-items: start;

  ${mq.lg} {
    grid-template-columns: 280px minmax(0, 1fr);
  }
`;

const Categories = styled.section`
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid ${c.line};
  border-radius: ${radius.lg};
  background: ${c.surface};

  ${mq.lg} {
    position: sticky;
    top: 92px;
  }
`;

const CatHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;

  h2 {
    font-family: ${font.text};
    font-size: 0.9375rem;
    letter-spacing: 0;
  }
`;

const CatList = styled.ul`
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;

  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 4px;
    border-radius: ${radius.md};
  }

  li:hover > div,
  li:focus-within > div {
    opacity: 1;
  }
`;

const CatButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  border-radius: ${radius.md};
  background: none;
  color: ${c.inkSoft};
  font-weight: 600;
  font-size: 0.9375rem;
  text-align: left;
  cursor: pointer;

  span {
    margin-left: auto;
    color: ${c.muted};
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
  }

  em {
    font-style: normal;
    font-size: 0.75rem;
    color: ${c.red};
  }

  &[aria-pressed='true'] {
    background: ${c.ink};
    color: ${c.paper};
  }
  &[aria-pressed='true'] span {
    color: ${c.creamMuted};
  }

  ${mq.hover} {
    &:hover:not([aria-pressed='true']) {
      background: ${c.paper2};
    }
  }
`;

const CatTools = styled.div`
  display: flex;
  opacity: 0.35;
  transition: opacity 160ms ease;
`;

const Products = styled.section`
  display: grid;
  gap: 16px;
`;

const Table = styled.ul`
  display: grid;
  margin: 0;
  padding: 0;
  border: 1px solid ${c.line};
  border-radius: ${radius.lg};
  background: ${c.surface};
  overflow: hidden;
`;

const Row = styled.li`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-bottom: 1px solid ${c.line};

  &:last-of-type {
    border-bottom: 0;
  }

  &[data-off='true'] > *:not(:nth-child(4)):not(:nth-child(5)) {
    opacity: 0.5;
  }
`;

const Thumb = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: 64px;
  height: 48px;
  overflow: hidden;
  border-radius: ${radius.sm};
  background: ${c.paper2};
  color: ${c.muted};

  img {
    object-fit: cover;
  }
  &[data-contain] img {
    object-fit: contain;
    padding: 3px;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const Info = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 0.9375rem;
  }

  span {
    font-size: 0.8125rem;
    color: ${c.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const Tag = styled.span`
  && {
    padding: 1px 6px;
    border-radius: 4px;
    background: ${c.amberSoft};
    color: ${c.amberInk};
    font-size: 0.6875rem;
    font-weight: 700;
    white-space: nowrap;
  }

  &&[data-tone='promo'] {
    background: ${c.red};
    color: #fff8ee;
  }
`;

const Price = styled.div`
  display: grid;
  justify-items: end;
  font-variant-numeric: tabular-nums;
  font-size: 0.9375rem;

  s {
    font-size: 0.8125rem;
    color: ${c.muted};
  }
`;

const Tools = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const Empty = styled.p`
  padding: 40px 16px;
  border: 1px dashed ${c.lineStrong};
  border-radius: ${radius.lg};
  color: ${c.muted};
  text-align: center;
`;

const Danger = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(184, 50, 32, 0.25);
  border-radius: ${radius.lg};

  h2 {
    font-family: ${font.text};
    font-size: 0.9375rem;
    letter-spacing: 0;
  }

  p {
    font-size: 0.875rem;
    color: ${c.muted};
    max-width: 60ch;
  }
`;
