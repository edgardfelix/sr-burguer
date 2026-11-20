import { formatBRL } from './money';
import { formatOrderNumber, PAYMENT_LABELS } from './order';
import { formatClock, TIME_ZONE } from './schedule';
import { formatAddressLine } from './site';
import type { Order, StoreSettings } from './types';

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Celular ou fixo brasileiro com DDD: 10 ou 11 dígitos (sem o 55).
 * Celulares com 11 dígitos começam com 9 após o DDD.
 */
export function isValidBrazilianPhone(value: string): boolean {
  let digits = onlyDigits(value);
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (digits.length === 11 && digits[2] !== '9') return false;
  return true;
}

/** "11987654321" -> "(11) 98765-4321". Aceita entrada parcial (máscara enquanto digita). */
export function formatPhone(value: string): string {
  let digits = onlyDigits(value);
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Número para o wa.me: só dígitos, com DDI 55. */
export function toWhatsAppNumber(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;
}

const orderDate = new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit' });

/**
 * Comprovante do pedido para enviar à loja pelo WhatsApp: cliente, itens (com a bebida dos combos),
 * totais, entrega e pagamento. Usa o *negrito* do WhatsApp e nenhum emoji.
 */
export function buildOrderMessage(order: Order, settings: Pick<StoreSettings, 'name' | 'address'>): string {
  const lines: string[] = [];
  lines.push(`*Pedido ${formatOrderNumber(order.number)} | ${settings.name}*`);
  if (order.createdAt > 0) lines.push(`Feito em ${orderDate.format(order.createdAt)} às ${formatClock(order.createdAt)}`);
  lines.push('');
  lines.push('*Cliente*');
  lines.push(order.customer.name);
  lines.push(`WhatsApp: ${formatPhone(order.customer.phone)}`);
  lines.push('');
  lines.push('*Itens*');
  for (const item of order.items) {
    lines.push(`${item.quantity}x ${item.name}: ${formatBRL(item.total)}`);
    if (item.drink) lines.push(`   Bebida: ${item.drink.name}`);
    if (item.note) lines.push(`   Obs.: ${item.note}`);
  }
  lines.push('');
  lines.push(`Subtotal: ${formatBRL(order.subtotal)}`);
  if (order.fulfillment.type === 'delivery') {
    lines.push(`Entrega: ${order.deliveryFee === null ? 'a combinar' : formatBRL(order.deliveryFee)}`);
  }
  lines.push(`*Total: ${formatBRL(order.total)}*${order.fulfillment.type === 'delivery' && order.deliveryFee === null ? ' + entrega' : ''}`);
  lines.push('');
  if (order.fulfillment.type === 'delivery' && order.fulfillment.address) {
    const a = order.fulfillment.address;
    lines.push('*Entrega*');
    lines.push(`${a.street}, ${a.number}`);
    lines.push(`Bairro: ${a.district}`);
    if (a.reference) lines.push(`Referência: ${a.reference}`);
    lines.push(`${settings.address.city}/${settings.address.state}`);
  } else {
    lines.push('*Retirada no balcão*');
    const counter = formatAddressLine(settings.address);
    if (counter) lines.push(counter);
  }
  lines.push('');
  lines.push('*Pagamento*');
  if (order.payment.method === 'cash') {
    lines.push(order.payment.changeFor ? `Dinheiro, troco para ${formatBRL(order.payment.changeFor)}` : 'Dinheiro, sem troco');
  } else {
    lines.push(PAYMENT_LABELS[order.payment.method]);
  }
  if (order.notes) {
    lines.push('');
    lines.push('*Observações*');
    lines.push(order.notes);
  }
  return lines.join('\n');
}
