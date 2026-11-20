'use client';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields: Record<string, string> = {},
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** fetch JSON com erros da API em português (mensagem + campos). */
export async function apiFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Sem conexão. Confira a internet e tente de novo.');
  }
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    const body = data as { error?: string; fields?: Record<string, string>; code?: string };
    throw new ApiError(res.status, body.error ?? 'Não foi possível concluir. Tente de novo.', body.fields, body.code);
  }
  return data as T;
}
