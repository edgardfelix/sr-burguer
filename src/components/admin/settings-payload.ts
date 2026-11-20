import type { StoreSettings } from '@/lib/types';

/** Corpo do PUT /api/admin/settings a partir das configurações atuais (sem campos de controle). */
export function toSettingsPayload(settings: StoreSettings) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt, ...rest } = settings;
  return { ...rest, logo: rest.logo ?? null };
}
