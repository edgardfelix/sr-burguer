import { describe, expect, it } from 'vitest';
import { orderInputSchema } from './schemas';
import { createDefaultSettings } from './seed';
import type { Order } from './types';
import { buildOrderMessage, formatPhone, isValidBrazilianPhone, toWhatsAppNumber, whatsappLink } from './whatsapp';

describe('telefone', () => {
  it('valida celulares e fixos com DDD', () => {
    expect(isValidBrazilianPhone('(11) 98765-4321')).toBe(true);
    expect(isValidBrazilianPhone('1141234567')).toBe(true);
    expect(isValidBrazilianPhone('5511987654321')).toBe(true);
    expect(isValidBrazilianPhone('11 8765-432')).toBe(false);
    expect(isValidBrazilianPhone('11887654321')).toBe(false);
    expect(isValidBrazilianPhone('0987654321')).toBe(false);
  });

  it('aplica máscara progressiva', () => {
    expect(formatPhone('1')).toBe('(1');
    expect(formatPhone('11987')).toBe('(11) 987');
    expect(formatPhone('1198765432')).toBe('(11) 9876-5432');
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
  });

  it('monta o número internacional do wa.me', () => {
    expect(toWhatsAppNumber('(11) 98765-4321')).toBe('5511987654321');
    expect(toWhatsAppNumber('5511987654321')).toBe('5511987654321');
    expect(whatsappLink('11987654321', 'Olá')).toBe('https://wa.me/5511987654321?text=Ol%C3%A1');
  });
});

const order: Order = {
  id: 'abc',
  number: 7,
  businessDate: '2026-11-15',
  createdAt: 0,
  updatedAt: 0,
  status: 'novo',
  customer: { name: 'Maria Souza', phone: '11987654321' },
  fulfillment: { type: 'delivery', address: { street: 'Rua das Flores', number: '120', district: 'Centro', reference: 'Perto da praça' } },
  payment: { method: 'cash', changeFor: 10000 },
  items: [
    { productId: 'sr-salad-bacon', name: 'SR Salad Bacon', unitPrice: 2999, quantity: 2, note: 'sem tomate', total: 5998 },
    {
      productId: 'combo-sr-salad',
      name: 'Combo SR Salad',
      unitPrice: 3499,
      quantity: 1,
      drink: { id: 'guarana-antarctica-200ml', name: 'Guaraná Antarctica 200 ml' },
      total: 3499,
    },
  ],
  notes: 'Tocar o interfone',
  subtotal: 9497,
  deliveryFee: null,
  total: 9497,
};

describe('mensagem do pedido', () => {
  // 15/11/2026 às 20:05 em São Paulo (UTC-3).
  const message = buildOrderMessage({ ...order, createdAt: Date.UTC(2026, 10, 15, 23, 5) }, createDefaultSettings());

  it('abre com número, loja, horário e cliente', () => {
    const [title, when, , customerTitle, name, phone] = message.split('\n');
    expect(title).toBe('*Pedido #0007 | SR Burguer*');
    expect(when).toBe('Feito em 15/11 às 20:05');
    expect(customerTitle).toBe('*Cliente*');
    expect(name).toBe('Maria Souza');
    expect(phone).toBe('WhatsApp: (11) 98765-4321');
  });

  it('lista itens com bebida do combo, totais, entrega e pagamento', () => {
    expect(message).toContain('2x SR Salad Bacon: R$ 59,98\n   Obs.: sem tomate');
    expect(message).toContain('1x Combo SR Salad: R$ 34,99\n   Bebida: Guaraná Antarctica 200 ml');
    expect(message).toContain('Entrega: a combinar');
    expect(message).toContain('*Total: R$ 94,97* + entrega');
    expect(message).toContain('Rua das Flores, 120');
    expect(message).toContain('Dinheiro, troco para R$ 100,00');
    expect(message).toContain('Tocar o interfone');
  });

  it('não usa travessões nem emojis', () => {
    expect(message).not.toMatch(/[\u2013\u2014]/);
    expect(message).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('descreve retirada no balcão', () => {
    const store = { ...createDefaultSettings(), address: { street: 'Rua Exemplo', number: '10', district: 'Centro', city: 'Itapevi', state: 'SP' } };
    const pickup = buildOrderMessage({ ...order, fulfillment: { type: 'pickup' }, payment: { method: 'pix' } }, store);
    expect(pickup).toContain('*Retirada no balcão*');
    expect(pickup).toContain('Rua Exemplo, 10, Centro');
    expect(pickup).toContain('Pix');
    expect(pickup).not.toContain('+ entrega');
  });
});

describe('schema do pedido', () => {
  const valid = {
    customer: { name: 'Maria Souza', phone: '(11) 98765-4321' },
    fulfillment: { type: 'delivery', address: { street: 'Rua das Flores', number: '120', district: 'Centro' } },
    payment: { method: 'pix' },
    items: [{ productId: 'sr-salad-bacon', quantity: 1 }],
  };

  it('aceita um pedido válido e normaliza o telefone', () => {
    const parsed = orderInputSchema.parse(valid);
    expect(parsed.customer.phone).toBe('11987654321');
  });

  it('exige endereço na entrega e recusa honeypot preenchido', () => {
    expect(orderInputSchema.safeParse({ ...valid, fulfillment: { type: 'delivery' } }).success).toBe(false);
    expect(orderInputSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false);
    expect(orderInputSchema.safeParse({ ...valid, fulfillment: { type: 'pickup' } }).success).toBe(true);
  });
});
