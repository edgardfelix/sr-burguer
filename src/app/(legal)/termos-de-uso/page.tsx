import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos de uso',
  description: 'Condições para fazer pedidos pelo site da SR Burguer: preços, entrega, pagamento e cancelamento.',
  alternates: { canonical: '/termos-de-uso' },
  openGraph: { url: '/termos-de-uso' },
};

export default function TermsPage() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p>Última atualização: 20 de novembro de 2026.</p>

      <p>
        Estes termos valem para os pedidos feitos pelo site da SR Burguer, hamburgueria com delivery em Itapevi/SP. Ao enviar um pedido, você
        concorda com as condições abaixo.
      </p>

      <h2>Pedidos</h2>
      <ul>
        <li>O pedido é recebido pela loja assim que você o envia e recebe um número, mostrado na tela de confirmação.</li>
        <li>Pedidos só podem ser enviados no horário de funcionamento exibido no site. Fora dele, você pode montar o pedido e enviar quando a loja abrir.</li>
        <li>A loja pode recusar ou cancelar pedidos com dados incompletos, endereço fora da área de entrega ou itens indisponíveis, avisando pelo WhatsApp informado.</li>
      </ul>

      <h2>Preços e disponibilidade</h2>
      <ul>
        <li>Os preços estão em reais e são os do momento do envio do pedido. O valor final é calculado pelo sistema da loja, não pelo aparelho do cliente.</li>
        <li>Promoções valem pelo prazo indicado no site ou enquanto durarem os itens.</li>
        <li>Fotos são ilustrativas da montagem; ingredientes e porções seguem a descrição de cada item.</li>
      </ul>

      <h2>Entrega</h2>
      <ul>
        <li>Atendemos só por delivery, em Itapevi/SP. A taxa de entrega aparece no carrinho ou é combinada pelo WhatsApp antes do envio do pedido.</li>
        <li>O tempo de preparo e entrega é uma estimativa e pode variar com o movimento e o trânsito.</li>
      </ul>

      <h2>Pagamento</h2>
      <p>
        O pagamento é feito na entrega, por Pix, cartão na maquininha ou dinheiro. Para pagamento em dinheiro, informe o valor para troco
        no pedido.
      </p>

      <h2>Cancelamento e problemas com o pedido</h2>
      <ul>
        <li>Para cancelar, fale com a loja pelo WhatsApp o quanto antes. Pedidos que já estão em preparo podem não ser cancelados.</li>
        <li>Se algo vier errado ou faltando, avise a loja no mesmo dia para que o problema seja resolvido.</li>
      </ul>

      <h2>Alergias e restrições</h2>
      <p>
        Nossos lanches podem conter glúten, lactose, ovos e outros alérgenos, e são preparados em cozinha compartilhada. Em caso de alergia, fale com a loja
        antes de pedir.
      </p>

      <h2>Uso do site</h2>
      <p>
        É proibido usar o site para pedidos falsos, envio automatizado ou tentativas de acesso ao painel da loja. A loja pode bloquear acessos que violem
        estes termos.
      </p>

      <h2>Privacidade</h2>
      <p>
        O tratamento dos seus dados segue a <Link href="/politica-de-privacidade">Política de privacidade</Link> e a{' '}
        <Link href="/politica-de-cookies">Política de cookies</Link>.
      </p>

      <h2>Legislação e foro</h2>
      <p>
        Estes termos seguem a legislação brasileira, incluindo o Código de Defesa do Consumidor. Fica eleito o foro da comarca de Itapevi/SP, sem prejuízo
        do direito do consumidor de recorrer ao foro do seu domicílio.
      </p>
    </>
  );
}
