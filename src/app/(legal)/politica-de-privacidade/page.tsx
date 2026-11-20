import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de privacidade',
  description: 'Como a SR Burguer coleta, usa e protege os dados dos pedidos feitos pelo site, conforme a LGPD.',
  alternates: { canonical: '/politica-de-privacidade' },
  openGraph: { url: '/politica-de-privacidade' },
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Política de privacidade</h1>
      <p>Última atualização: 20 de novembro de 2026.</p>

      <p>
        Esta política explica como a SR Burguer, hamburgueria com delivery em Itapevi/SP, trata os dados
        pessoais de quem faz pedidos por este site, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>Nome e número de WhatsApp, para identificar e confirmar o pedido.</li>
        <li>Endereço de entrega (rua, número, bairro e ponto de referência), quando o pedido é para entrega.</li>
        <li>Itens escolhidos, observações, forma de pagamento e valor do troco.</li>
        <li>Dados técnicos mínimos de segurança, como um código derivado do endereço IP, usado para limitar pedidos em sequência. O IP não é guardado em texto.</li>
      </ul>
      <p>Não coletamos CPF, dados de cartão nem senhas de clientes. O pagamento é feito na entrega.</p>

      <h2>Para que usamos</h2>
      <ul>
        <li>Preparar e entregar o seu pedido e falar com você sobre ele.</li>
        <li>Calcular valores, troco e taxa de entrega.</li>
        <li>Proteger o site contra uso abusivo e pedidos falsos.</li>
        <li>Gerar o fechamento diário de vendas, com totais que não identificam clientes.</li>
      </ul>
      <p>
        A base legal é a execução do pedido que você solicita (art. 7º, V, da LGPD) e o legítimo interesse na segurança do serviço (art. 7º, IX).
        Não enviamos propaganda e não vendemos nem alugamos seus dados.
      </p>

      <h2>Quem tem acesso</h2>
      <p>Apenas a equipe da loja, pelo painel com login e senha. Usamos fornecedores que processam dados em nosso nome:</p>
      <ul>
        <li>Vercel Inc., hospedagem do site.</li>
        <li>Google LLC (Firebase Realtime Database), armazenamento dos pedidos.</li>
      </ul>
      <p>
        Esses serviços podem guardar dados em servidores fora do Brasil, com as garantias de segurança e contratuais previstas no art. 33 da LGPD.
        Se você escolher enviar o resumo do pedido pelo WhatsApp, a mensagem segue também os termos do WhatsApp.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Os pedidos ficam no painel durante o expediente. Todos os dias, às 04:00, são movidos para um arquivo interno e apagados depois de 30 dias.
        O resumo diário de vendas guarda apenas totais, sem nome, telefone ou endereço.
      </p>
      <p>
        Seus dados de entrega e o último pedido também podem ficar salvos no seu próprio aparelho, para facilitar o próximo pedido e para você
        acompanhar o andamento. A consulta do andamento usa um código aleatório que só o seu aparelho recebe e devolve apenas o status, sem
        nome, telefone ou endereço. Veja a <Link href="/politica-de-cookies">Política de cookies</Link> para saber como apagar.
      </p>

      <h2>Seus direitos</h2>
      <p>Pela LGPD (art. 18), você pode pedir a qualquer momento:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>eliminação dos dados tratados, ressalvadas obrigações legais;</li>
        <li>informações sobre com quem compartilhamos seus dados.</li>
      </ul>
      <p>
        Para exercer seus direitos, fale com a loja pelo WhatsApp informado no site, pelo Instagram{' '}
        <a href="https://www.instagram.com/sr_burguer_01/" target="_blank" rel="noopener noreferrer">
          @sr_burguer_01
        </a>
        . Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>Segurança</h2>
      <p>
        O site usa conexão criptografada (HTTPS). O banco de dados só aceita gravações feitas pelo servidor da loja, a leitura dos pedidos exige o
        login da equipe e o painel tem verificação contra robôs e bloqueio após tentativas erradas de senha.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>Quando houver mudança relevante, a nova versão será publicada nesta página com a data de atualização.</p>
    </>
  );
}
