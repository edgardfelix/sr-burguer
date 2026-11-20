'use client';

import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { toast } from 'sonner';
import { ApiError } from '@/client/api';
import { categoryInputSchema } from '@/lib/schemas';
import type { Category } from '@/lib/types';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { Switch } from '../ui/Switch';
import { useAdmin } from './AdminData';

export function CategoryForm({ category, open, onClose }: { category: Category | null; open: boolean; onClose: () => void }) {
  const { adminFetch, refresh } = useAdmin();
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [active, setActive] = useState(category?.active ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = categoryInputSchema.safeParse({ name, description, active });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Confira o nome');
      return;
    }
    setSaving(true);
    try {
      if (category) await adminFetch(`/api/admin/catalog/categories/${category.id}`, { method: 'PUT', json: parsed.data });
      else await adminFetch('/api/admin/catalog/categories', { method: 'POST', json: parsed.data });
      toast.success(category ? 'Categoria atualizada' : 'Categoria criada');
      await refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!category) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await adminFetch(`/api/admin/catalog/categories/${category.id}`, { method: 'DELETE' });
      toast.success('Categoria removida');
      await refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível remover.');
      setConfirmDelete(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={category ? 'Editar categoria' : 'Nova categoria'}
      desktop="center"
      footer={
        <Footer>
          {category ? (
            <Button type="button" data-variant={confirmDelete ? 'danger' : 'ghost'} onClick={() => void remove()}>
              {confirmDelete ? 'Confirmar exclusão' : 'Excluir categoria'}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" form="form-categoria" data-loading={saving} disabled={saving}>
            {category ? 'Salvar' : 'Criar categoria'}
          </Button>
        </Footer>
      }
    >
      <Form id="form-categoria" onSubmit={submit} noValidate>
        <TextField label="Nome" value={name} maxLength={40} error={error} onChange={(e) => setName(e.target.value)} />
        <TextField label="Descrição" optional value={description} maxLength={140} hint="Aparece abaixo do título da seção no cardápio." onChange={(e) => setDescription(e.target.value)} />
        <Switch showLabel label="Categoria visível no cardápio" checked={active} onChange={setActive} />
      </Form>
    </Sheet>
  );
}

const Form = styled.form`
  display: grid;
  gap: 18px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
`;
