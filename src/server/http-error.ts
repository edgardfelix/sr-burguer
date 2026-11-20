export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string>,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notConfigured = () =>
  new HttpError(
    503,
    'Banco de dados não configurado. Cadastre as variáveis do Firebase para receber pedidos.',
    undefined,
    'db_not_configured',
  );
