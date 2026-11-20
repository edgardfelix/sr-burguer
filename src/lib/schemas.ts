import { z } from 'zod';
import { MAX_LINES_PER_ORDER, MAX_QUANTITY_PER_ITEM } from './order';
import { parseHHMM } from './schedule';
import { isValidBrazilianPhone, onlyDigits } from './whatsapp';

/** Mensagens de erro em português, com o campo e o que digitar. */

const imagePath = z
  .string()
  .max(300)
  .regex(/^\/(images\/[\w\-./]+|api\/media\/[\w-]+)$/, 'Imagem inválida');

// ---------------------------------------------------------------- Pedido

export const customerSchema = z.object({
  name: z.string().trim().min(3, 'Escreva seu nome completo').max(80, 'Use até 80 caracteres no nome'),
  phone: z
    .string()
    .trim()
    .refine(isValidBrazilianPhone, 'Informe um WhatsApp com DDD, por exemplo (11) 98765-4321')
    .transform(onlyDigits),
});

export const addressSchema = z.object({
  street: z.string().trim().min(3, 'Informe a rua').max(120, 'Rua muito longa'),
  number: z.string().trim().min(1, 'Informe o número').max(12, 'Número muito longo'),
  district: z.string().trim().min(2, 'Informe o bairro').max(80, 'Bairro muito longo'),
  reference: z.string().trim().max(140, 'Use até 140 caracteres na referência').optional(),
});

export const fulfillmentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pickup') }),
  z.object({ type: z.literal('delivery'), address: addressSchema }),
]);

export const paymentSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('pix') }),
  z.object({ method: z.literal('card') }),
  z.object({
    method: z.literal('cash'),
    changeFor: z.number().int().positive().max(1_000_000).nullable().optional(),
  }),
]);

export const orderItemInputSchema = z.object({
  productId: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
  note: z.string().trim().max(140, 'Use até 140 caracteres na observação').optional(),
  /** Bebida do combo; o servidor confere se está entre as opções disponíveis. */
  drinkId: z.string().min(1).max(80).optional(),
});

export const orderInputSchema = z.object({
  customer: customerSchema,
  fulfillment: fulfillmentSchema,
  payment: paymentSchema,
  items: z.array(orderItemInputSchema).min(1, 'Seu pedido está vazio').max(MAX_LINES_PER_ORDER),
  notes: z.string().trim().max(500, 'Use até 500 caracteres nas observações').optional(),
  /** Campo isca (honeypot): pessoas não preenchem. */
  website: z.string().max(0).optional(),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

// ---------------------------------------------------------------- Painel

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido').max(120),
  password: z.string().min(1, 'Informe a senha').max(200),
  captchaToken: z.string().min(10).max(600),
  captchaAnswer: z.string().trim().regex(/^-?\d{1,4}$/, 'Responda o desafio com números'),
  website: z.string().max(0).optional(),
});

export const productInputSchema = z
  .object({
    categoryId: z.string().min(1, 'Escolha a categoria').max(80),
    name: z.string().trim().min(2, 'Dê um nome ao item').max(80, 'Use até 80 caracteres'),
    description: z.string().trim().max(300, 'Use até 300 caracteres'),
    price: z.number().int().min(0).max(1_000_000),
    promoPrice: z.number().int().min(1).max(1_000_000).nullable().optional(),
    promoEndsAt: z.number().int().positive().nullable().optional(),
    image: imagePath.nullable().optional(),
    imageAlt: z.string().trim().max(140).optional(),
    imageContain: z.boolean().optional(),
    available: z.boolean(),
    featured: z.boolean(),
    order: z.number().int().min(0).max(10_000).optional(),
    /** Ausente na edição = mantém o valor salvo. */
    drinkChoice: z.enum(['none', 'optional', 'required']).optional(),
    comboDrink: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.promoPrice != null && value.promoPrice >= value.price) {
      ctx.addIssue({ code: 'custom', message: 'O preço promocional precisa ser menor que o preço cheio', path: ['promoPrice'] });
    }
  });

export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, 'Dê um nome à categoria').max(40, 'Use até 40 caracteres'),
  description: z.string().trim().max(140).optional(),
  active: z.boolean(),
  order: z.number().int().min(0).max(1000).optional(),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1).max(80)).min(1).max(500),
});

const hhmm = z.string().refine((v) => !Number.isNaN(parseHHMM(v)), 'Use o formato HH:MM');

const dayHoursSchema = z
  .object({ enabled: z.boolean(), open: hhmm, close: hhmm })
  .refine((d) => !d.enabled || d.open !== d.close, { message: 'Abertura e fechamento iguais', path: ['close'] });

export const settingsInputSchema = z
  .object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(80),
  logo: imagePath.nullable().optional(),
  whatsapp: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine((v) => v === '' || isValidBrazilianPhone(v), 'WhatsApp com DDD, por exemplo (11) 98765-4321'),
  pixKey: z.string().trim().max(120),
  instagram: z
    .string()
    .trim()
    .max(60)
    .transform((v) => v.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')),
  ifoodUrl: z.union([z.literal(''), z.string().trim().url('Link inválido').max(300)]),
  // Rua, número e bairro podem ficar vazios na loja só de delivery (sem balcão); veja o superRefine abaixo.
  address: z.object({
    street: z.union([z.literal(''), z.string().trim().min(3).max(120)]),
    number: z.string().trim().max(12),
    district: z.string().trim().max(80),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().length(2),
  }),
  deliveryFee: z.number().int().min(0).max(100_000).nullable(),
  minOrder: z.number().int().min(0).max(1_000_000),
  acceptsDelivery: z.boolean(),
  acceptsPickup: z.boolean(),
  etaText: z.string().trim().max(40),
  hours: z.object({
    0: dayHoursSchema,
    1: dayHoursSchema,
    2: dayHoursSchema,
    3: dayHoursSchema,
    4: dayHoursSchema,
    5: dayHoursSchema,
    6: dayHoursSchema,
  }),
  mode: z.enum(['auto', 'open', 'closed']),
  announcement: z.object({ active: z.boolean(), text: z.string().trim().max(140) }),
  repeatAlert: z.boolean(),
  })
  .superRefine((value, ctx) => {
    // Com retirada no balcão, o endereço completo é obrigatório: ele aparece no pedido e na confirmação.
    if (!value.acceptsPickup) return;
    const { street, number, district } = value.address;
    if (street.length < 3) ctx.addIssue({ code: 'custom', message: 'Informe a rua para a retirada no balcão', path: ['address', 'street'] });
    if (number.length < 1) ctx.addIssue({ code: 'custom', message: 'Informe o número', path: ['address', 'number'] });
    if (district.length < 2) ctx.addIssue({ code: 'custom', message: 'Informe o bairro', path: ['address', 'district'] });
  });

export type SettingsInput = z.infer<typeof settingsInputSchema>;

export const storeModeSchema = z.object({ mode: z.enum(['auto', 'open', 'closed']) });

export const orderStatusSchema = z.object({
  status: z.enum(['novo', 'preparando', 'despachado', 'concluido', 'cancelado']),
});

export const promoSchema = z.object({
  promoPrice: z.number().int().min(1).max(1_000_000).nullable(),
  /** Duração em minutos a partir de agora; null = até desligar. */
  durationMinutes: z.number().int().min(5).max(60 * 24 * 14).nullable(),
});

export const mediaUploadSchema = z.object({
  /** data URL de imagem já reduzida no navegador. */
  dataUrl: z
    .string()
    .max(1_400_000, 'Imagem muito grande')
    .regex(/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/, 'Formato de imagem inválido'),
});
