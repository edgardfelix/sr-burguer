import { buildMenuSections, effectivePrice, isPromoActive } from '@/lib/catalog';
import { formatBRL } from '@/lib/money';
import { summarizeHours } from '@/lib/schedule';
import { absoluteUrl, formatCityLine, formatLocationLine, hasStreetAddress, instagramUrl, SITE } from '@/lib/site';
import { loadMenu } from '@/server/services/catalog';

/** llms.txt: resumo em Markdown para assistentes de IA, gerado do cardápio real (revalidado pelo painel). */
export const revalidate = 3600;

export async function GET() {
  const { catalog, settings, loadedAt } = await loadMenu();
  const sections = buildMenuSections(catalog, loadedAt);
  const insta = instagramUrl(settings.instagram);
  const storefront = hasStreetAddress(settings.address);
  const modes = [storefront && settings.acceptsPickup ? 'salão' : '', settings.acceptsDelivery ? 'entrega' : '', settings.acceptsPickup ? 'retirada no balcão' : '']
    .filter(Boolean)
    .join(', ');
  const lines: string[] = [
    `# ${settings.name}`,
    '',
    `> Hamburgueria artesanal ${storefront && settings.address.district ? `na ${settings.address.district}, em` : 'com delivery em'} ${formatCityLine(settings.address)}. Lanches com carne artesanal de 120 g, combos com batata e refrigerante de 200 ml e promoções. Pedidos pelo site${settings.acceptsPickup ? ' para entrega ou retirada no balcão' : ' para entrega'}.`,
    '',
    '## Informações',
    '',
    `- ${storefront ? 'Endereço' : 'Área de entrega'}: ${formatLocationLine(settings.address)}`,
    `- Horário: ${summarizeHours(settings.hours).join('; ') || 'consulte o site'}`,
    `- Atendimento: ${modes || 'consulte o site'}`,
    `- Pagamento: Pix, cartão (maquininha) e dinheiro, ${settings.acceptsPickup ? 'na entrega ou na retirada' : 'na entrega'}`,
    `- Taxa de entrega: ${settings.deliveryFee === null ? 'combinada pelo WhatsApp' : formatBRL(settings.deliveryFee)}`,
    ...(insta ? [`- Instagram: ${insta}`] : []),
    '',
    '## Páginas',
    '',
    `- [Cardápio e pedidos](${absoluteUrl('/')}): cardápio completo com preços atualizados e pedido online`,
    `- [Política de privacidade](${absoluteUrl('/politica-de-privacidade')})`,
    `- [Termos de uso](${absoluteUrl('/termos-de-uso')})`,
    `- [Política de cookies](${absoluteUrl('/politica-de-cookies')})`,
    '',
    '## Cardápio',
    '',
  ];
  for (const section of sections) {
    lines.push(`### ${section.category.name}`, '');
    for (const product of section.products) {
      const price = formatBRL(effectivePrice(product, loadedAt));
      const promo = isPromoActive(product, loadedAt) ? ` (promoção, de ${formatBRL(product.price)})` : '';
      lines.push(`- ${product.name}: ${price}${promo}${product.description ? `. ${product.description}` : ''}`);
    }
    lines.push('');
  }
  lines.push(`Preços em reais, sujeitos a alteração. Fonte: ${SITE.name}, ${absoluteUrl('/')}`);

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
