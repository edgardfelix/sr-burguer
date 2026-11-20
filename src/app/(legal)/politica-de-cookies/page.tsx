import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'O que o site da SR Burguer guarda no seu aparelho e como apagar. Sem cookies de anúncios ou rastreamento.',
  alternates: { canonical: '/politica-de-cookies' },
  openGraph: { url: '/politica-de-cookies' },
};

export default function CookiesPage() {
  return (
    <>
      <h1>Política de cookies</h1>
      <p>Última atualização: 20 de novembro de 2026.</p>

      <p>
        O site da SR Burguer não usa cookies de publicidade, de redes sociais nem ferramentas de rastreamento. Guardamos no seu aparelho apenas o
        necessário para o pedido funcionar.
      </p>

      <h2>O que fica salvo no seu aparelho</h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Para que serve</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>srburguer-carrinho</code>
            </td>
            <td>Armazenamento local</td>
            <td>Mantém os itens do pedido se você fechar ou recarregar a página.</td>
          </tr>
          <tr>
            <td>
              <code>srburguer-cliente</code>
            </td>
            <td>Armazenamento local</td>
            <td>Lembra nome, WhatsApp e endereço para preencher o próximo pedido.</td>
          </tr>
          <tr>
            <td>
              <code>srburguer-ultimo-pedido</code>
            </td>
            <td>Armazenamento local</td>
            <td>Guarda o último pedido feito neste aparelho para você acompanhar o andamento. Deixa de aparecer no fim do dia.</td>
          </tr>
          <tr>
            <td>
              <code>srburguer-jogo-recorde</code>
            </td>
            <td>Armazenamento local</td>
            <td>Guarda o seu recorde no jogo da tela de acompanhamento.</td>
          </tr>
          <tr>
            <td>
              <code>srburguer-som</code>
            </td>
            <td>Armazenamento local</td>
            <td>Guarda se os sons do site estão ligados ou desligados.</td>
          </tr>
          <tr>
            <td>
              <code>srburguer-aviso-cookies</code>
            </td>
            <td>Armazenamento local</td>
            <td>Registra que você já viu este aviso.</td>
          </tr>
          <tr>
            <td>
              <code>bb_admin</code>
            </td>
            <td>Cookie essencial</td>
            <td>Sessão do painel, só para a equipe da loja. Expira em 12 horas.</td>
          </tr>
        </tbody>
      </table>
      <p>Esses dados ficam somente no seu navegador e não são compartilhados com terceiros.</p>

      <h2>Como apagar</h2>
      <p>
        Você pode apagar tudo nas configurações do navegador, em &quot;Limpar dados de navegação&quot; ou &quot;Cookies e dados do site&quot;. Em uma aba anônima,
        nada fica salvo depois que a aba é fechada.
      </p>

      <h2>Mais informações</h2>
      <p>
        Veja também a <Link href="/politica-de-privacidade">Política de privacidade</Link> e os <Link href="/termos-de-uso">Termos de uso</Link>.
      </p>
    </>
  );
}
