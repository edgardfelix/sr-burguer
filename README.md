# SR Burguer: cardápio digital e painel da loja

Site de pedidos da **SR Burguer** (hamburgueria só de delivery em Itapevi/SP, Instagram [@sr_burguer_01](https://www.instagram.com/sr_burguer_01/), WhatsApp (11) 91781-2791) com painel administrativo em tempo real.

Produção: <https://srburguer.vercel.app>

- **Cardápio público (`/`)**: pensado para o celular. Hero com vídeo real da casa, status aberto/fechado, categorias fixas no topo,
  escolha da bebida nos combos, carrinho em gaveta, checkout com entrega ou retirada, Pix, cartão ou dinheiro com troco.
  Depois do envio, tela de acompanhamento com o status real do pedido, botão "Enviar Pedido no WhatsApp" com o comprovante
  e o minijogo "Monte o SR Burguer" na aba "Jogar enquanto espera".
- **Painel (`/admin`)**: pensado para o computador do balcão. Login com e-mail, senha e CAPTCHA visual, tutorial no primeiro acesso,
  pedidos chegando em tempo real com campainha, impressão de comanda, cardápio, promoções relâmpago, horário e interruptor da loja.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front-end | Next.js 16 (App Router), React 19, TypeScript, styled-components 6 (com suporte nativo a Server Components) |
| API | Express 5 montado em `src/pages/api/[[...route]].ts`, validação com Zod |
| Banco | Firebase Realtime Database (plano Spark, gratuito) |
| Hospedagem | Vercel (site, API serverless e Cron) |
| Gerenciador | Yarn 1 |

Decisões de arquitetura e o plano de execução estão em [`docs/PLANO.md`](docs/PLANO.md).

## Estrutura

```
src/
  app/                  páginas (App Router), SEO (sitemap, robots, manifest, llms.txt, imagem OG) e 404
    (legal)/            política de privacidade, termos de uso e política de cookies
    admin/              login e painel (/admin/pedidos, /admin/cardapio, /admin/promocoes, /admin/loja)
  pages/api/            ponte Next.js -> Express (toda a API passa por aqui)
  server/               código só de servidor: env, drivers de banco, serviços, rotas Express, segurança
  components/site/      cardápio público, acompanhamento do pedido
    game/               minijogo "Monte o SR Burguer" (motor puro testado + desenho em canvas)
  components/admin/     painel
  components/ui/        botões, campos, sheet responsivo, interruptor, skeleton
  client/               carrinho e pedido acompanhado (zustand), consulta do status, sons (Web Audio), Firebase do painel,
                        agendamento no tempo ocioso, hooks
  lib/                  domínio puro e testado: horário, preços, pedido, WhatsApp, SEO, cardápio inicial
scripts/                processamento de imagens e vídeo, hash da senha do painel
database.rules.json     regras de segurança do Realtime Database
vercel.json             Cron do fechamento diário
```

## Rodar localmente

Requisitos: Node 22 ou mais novo e Yarn 1.

```bash
yarn install
cp .env.example .env   # e preencha (veja abaixo)
yarn dev               # http://localhost:3000
```

Sem Firebase configurado, o projeto usa um **banco local** em `.data/db.json`. O fluxo inteiro funciona (pedido, painel,
campainha); o painel consulta os pedidos a cada 3 segundos nesse modo e mostra um aviso de "Modo local".

Painel: `http://localhost:3000/admin`. O e-mail é o de `ADMIN_EMAIL` e a senha é a que gerou o `ADMIN_PASSWORD_HASH`
(o `.env` local já vem com o hash da senha definida no briefing). Para trocar a senha:

```bash
yarn admin:hash "nova-senha-forte"
# cole o resultado em ADMIN_PASSWORD_HASH (no .env e na Vercel)
```

### Scripts

| Comando | O que faz |
| --- | --- |
| `yarn dev` | Servidor de desenvolvimento |
| `yarn build` / `yarn start` | Build e servidor de produção |
| `yarn test` | Testes (Vitest): horário, preços, bebida dos combos, pedido, WhatsApp, CAPTCHA, senha, sessão, acompanhamento, jogo e a API completa |
| `yarn lint` / `yarn typecheck` | ESLint e TypeScript |
| `yarn verify` | Typecheck, lint, testes e build em sequência |
| `yarn assets` | Gera as imagens otimizadas a partir de `assets/` (vídeo exige `FFMPEG_PATH`) |
| `yarn admin:hash "senha"` | Gera o hash da senha do painel |

## Configurar o Firebase (plano Spark)

1. Em [console.firebase.google.com](https://console.firebase.google.com), crie um projeto.
2. **Realtime Database**: Criar banco de dados, escolha a localização `us-central1` e comece no modo bloqueado.
3. **Regras**: em Realtime Database > Regras, cole o conteúdo de [`database.rules.json`](database.rules.json) e publique
   (ou rode `firebase deploy --only database` com a Firebase CLI). Resumo das regras:
   - nenhum navegador grava nada: toda escrita passa pela API, com validação;
   - `catalog` e `settings` têm leitura pública;
   - `orders`, `meta` e `reports` só podem ser lidos com o login do painel (claim `admin`).
4. **Authentication**: clique em "Vamos começar". Nenhum provedor precisa ser ativado: o painel entra com um custom token
   emitido pelo servidor.
5. **App da Web**: em Configurações do projeto > Seus apps, registre um app da Web e copie os valores para as variáveis
   `NEXT_PUBLIC_FIREBASE_*`.
6. **Conta de serviço**: em Configurações do projeto > Contas de serviço, gere uma nova chave privada (JSON). Use uma das opções:
   - `FIREBASE_SERVICE_ACCOUNT_BASE64`: o JSON inteiro em base64. No PowerShell:
     `[Convert]::ToBase64String([IO.File]::ReadAllBytes("conta.json"))`
   - ou `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` (entre aspas, com `\n` literais).

Na primeira execução com o banco vazio, o sistema grava sozinho o cardápio inicial (11 itens transcritos dos posts do
Instagram: a promoção de 2 lanches, os 4 lanches artesanais, os 4 combos e os 2 refris de 200 ml) e as configurações
padrão da loja (WhatsApp, Instagram, terça a domingo das 18:00 às 23:30, só delivery em Itapevi/SP).

> Imagens enviadas pelo painel ficam no próprio Realtime Database, já reduzidas no navegador, e são servidas por
> `/api/media/:id` com cache imutável na CDN. O Cloud Storage do Firebase exige o plano Blaze desde 2024; assim o projeto
> continua 100% gratuito.

## Publicar na Vercel

1. Importe o repositório na Vercel (framework detectado: Next.js; instalação com Yarn).
2. Em Settings > Environment Variables, cadastre:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública com https, hoje `https://srburguer.vercel.app` (troque ao ligar um domínio próprio) |
| `NEXT_PUBLIC_FIREBASE_*` | Os 7 valores do app da Web |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Conta de serviço (ou `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`) |
| `ADMIN_EMAIL` | E-mail de acesso ao painel |
| `ADMIN_PASSWORD_HASH` | Saída de `yarn admin:hash` |
| `SESSION_SECRET` | 32+ caracteres aleatórios: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `CRON_SECRET` | Outro segredo aleatório (a Vercel o envia ao chamar o Cron) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Código da meta tag do Search Console (opcional) |

3. **Domínio próprio**: em Settings > Domains, adicione o domínio. A Vercel emite o certificado e redireciona HTTP para HTTPS.
   O site também envia `Strict-Transport-Security`.
4. **Cron**: o [`vercel.json`](vercel.json) agenda `/api/cron/reset` para `0 7 * * *` (07:00 UTC = 04:00 em São Paulo).
   No plano Hobby a Vercel executa dentro daquela hora.

## Escolha de bebida nos combos

- Cada item tem a opção **Escolha de bebida**: Não pedir, Opcional ou Obrigatória (em Cardápio > editar item).
  Item novo na categoria Combos já nasce com Obrigatória.
- As opções são as próprias bebidas do cardápio com **Oferecer como bebida dos combos** ligado (Pepsi e Guaraná Antarctica 200 ml vêm ligados).
  Bebida pausada some da escolha na hora; se nenhuma estiver disponível, o combo continua à venda sem a pergunta.
- No site, o "+" do combo abre o item para escolher a bebida antes de adicionar. No carrinho dá para trocar a bebida.
  A bebida aparece no resumo do checkout, na tela de acompanhamento, na mensagem do WhatsApp, no card do pedido no painel
  e na comanda impressa. O servidor confere a escolha de novo ao receber o pedido; a bebida não altera o preço.
- Cardápios gravados antes desta função recebem o padrão do cardápio inicial na leitura: combos cuja descrição cita
  refrigerante pedem a bebida e as latas viram opção. Ao salvar o item no painel, vale o que foi salvo.

## Acompanhamento do pedido

- Ao criar o pedido, o servidor gera um código aleatório (144 bits) que só o aparelho de quem pediu recebe.
  `GET /api/orders/:id/tracking?t=código` devolve apenas número, status e horários, sem nome, telefone ou endereço.
  Código errado, pedido inexistente ou já arquivado no fechamento do dia respondem igual (404).
- O site consulta a cada 8 s com a tela de acompanhamento aberta e a cada 30 s com ela fechada (indicador no topo),
  pausa com a aba escondida e para quando o pedido é concluído ou cancelado. Cada mudança toca um som curto e vibra.
- O último pedido fica salvo no aparelho (`srburguer-ultimo-pedido`) e deixa de aparecer no fim do dia ou 30 minutos
  depois de concluído. Não exige mudança nas regras do Firebase: a consulta passa pela API.
- **Enviar Pedido no WhatsApp** abre o WhatsApp da loja com o comprovante: número, horário, cliente e telefone, itens com
  bebida e observações, totais, entrega e pagamento. O botão só aparece com o WhatsApp da loja preenchido em Loja e horário.
- **Monte o SR Burguer**: canvas leve, baixado só quando a aba do jogo é aberta. Ingredientes caem, o pão de baixo pega,
  o pão de cima fecha o lanche; carne queimada ou pão no chão tiram vida. Pausa sozinho fora da aba e guarda o recorde
  no aparelho (`srburguer-jogo-recorde`).

## Desempenho

- **Pôster do hero (imagem LCP)**: renderizado no servidor, pré-carregado no `<head>` com prioridade alta (`preload`, que
  substitui o `priority` obsoleto no Next 16) e com blur embutido enquanto a foto chega. Nada sobre ele começa com opacidade 0.
- **Vídeo do hero**: o player é um import dinâmico, montado só depois do `load`, no tempo ocioso do navegador. Com
  "reduzir movimento", economia de dados ou rede 2G/3G, só toca se a pessoa pedir.
- **Pacote inicial enxuto**: painéis do fluxo de compra (Vaul, Radix, validação), o jogo e as notificações (sonner) saem do
  pacote inicial e são baixados no tempo ocioso ou no primeiro toque. As fotos do cardápio carregam sob demanda.
- **Pré-carregamento de rotas**: as abas do painel (rotas dinâmicas, que o Next não pré-carrega por padrão) usam `prefetch`
  explícito; rodapé, cabeçalho das páginas legais e 404 pré-carregam a rota do cardápio.
- **Firebase do painel**: os módulos do SDK são importados em paralelo só depois da primeira pintura, no tempo ocioso, com
  `preconnect` aberto antes. Enquanto conecta, o painel consulta os pedidos a cada 3 s para não perder nenhum.

## Fechamento diário

Às 04:00 o Cron move os pedidos do expediente para `/archive/{data}`, grava o resumo do dia em `/reports/{data}`
(quantidade, faturamento, por forma de pagamento), apaga arquivos com mais de 30 dias e limpa contadores e dados de segurança.
O painel também confere a data ao abrir e a cada minuto: se o Cron não rodou, ele mesmo dispara o fechamento. A operação é
idempotente (rodar duas vezes não duplica nada). O "dia de negócio" vira às 04:00, então pedidos depois da meia-noite contam
para o expediente anterior.

## SEO

- Metadados por página, URL canônica, Open Graph e Twitter com imagem gerada (`/opengraph-image`), um único H1 por página.
- Dados estruturados `Restaurant` + `Menu` (schema.org) gerados do cardápio real, com horário, endereço e preços.
- `sitemap.xml`, `robots.txt` (bloqueia `/admin` e `/api`), `manifest.webmanifest` e `llms.txt` (resumo para assistentes de IA,
  com o cardápio atualizado).
- Página 404 com a identidade da marca, skeleton de carregamento, imagens em AVIF/WebP com tamanhos responsivos e vídeo
  carregado só depois do conteúdo principal.

**Google Search Console**: adicione a propriedade do domínio, escolha verificação por meta tag, copie só o valor de `content` para
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, publique e confirme. Depois envie `https://SEU-DOMINIO/sitemap.xml` em Sitemaps.

## Guia rápido do painel

- **Pedidos**: cada pedido novo toca uma campainha, aparece em "Novos" e muda o título da aba. Avance com o botão principal
  (aceitar, saiu para entrega ou pronto para retirada, concluir). Impressora gera a comanda (80 mm). O ícone de conversa abre o
  WhatsApp do cliente. Pagamento em dinheiro mostra quanto levar de troco.
- **Som**: navegadores bloqueiam áudio até o primeiro clique; se aparecer a faixa "Ativar alerta sonoro", clique nela.
  O sino ativa notificações do sistema para quando a aba estiver em segundo plano.
- **Cardápio**: preços, fotos, descrições, categorias e ordem. O interruptor de cada item tira ou recoloca o item no site na hora.
  Nos combos, "Escolha de bebida" define se o cliente escolhe o refri; nas bebidas, "Oferecer como bebida dos combos" põe a
  bebida na lista. A bebida escolhida aparece destacada no card do pedido e na comanda.
- **Promoções**: promoção relâmpago com preço e prazo (encerra sozinha), aviso no topo do cardápio e itens fixos da categoria
  Promoções (a promoção de 2 lanches, 2 batatas e 2 refris por R$ 59,99 vem ligada).
- **Loja e horário**: modo Automático (segue o horário), Sempre aberta ou Fechada, horário por dia, WhatsApp, Pix, taxa de entrega,
  pedido mínimo, tempo estimado e endereço. Loja só de delivery: retirada desligada e rua, número e bairro vazios
  (o site mostra "Delivery em Itapevi/SP"). Ao ligar a retirada, o painel volta a exigir o endereço completo.

## Segurança

- Escritas só pelo servidor (Admin SDK), com Zod; preço sempre recalculado no servidor.
- Login com senha em hash scrypt, CAPTCHA matemático em SVG distorcido (token HMAC sem estado e nonce de uso único),
  campo isca e bloqueio de 15 minutos após 5 tentativas por IP.
- Sessão em cookie `httpOnly`, `SameSite=Strict`, `Secure` em produção, JWT HS256 de 12 horas; checagem de origem nas escritas.
- Limite de 6 pedidos a cada 10 minutos por IP; IPs guardados apenas como hash.
- Acompanhamento só com o código do pedido (comparação em tempo constante), sem dados pessoais na resposta e com freio de
  40 consultas por minuto por IP.
- Cabeçalhos: CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`.

## Pendências do cliente

| Item | Onde ajustar |
| --- | --- |
| Logo em vetor | O selo atual vem do cartão final do vídeo (720 px): substitua `assets/logo/logo-hd.png` e rode `yarn assets`, ou envie em Loja e horário |
| Taxa de entrega | Loja e horário (sem valor, o site informa "combinada pelo WhatsApp") |
| Chave Pix | Loja e horário |
| Quais lanches entram na promoção de 2 lanches | Cardápio > Promoção 2 lanches (o post não especifica) |
| Fotos reais dos lanches em alta resolução | Cardápio > editar item (as atuais são recortes do post do cardápio no Instagram) |
| Domínio próprio | Vercel + `NEXT_PUBLIC_SITE_URL` |

## Solução de problemas

- **`yarn dev` muito lento no Windows**: o Turbopack grava cache em disco; antivírus ou pastas sincronizadas (OneDrive)
  deixam isso lento. Exclua a pasta do projeto da verificação em tempo real ou adicione
  `experimental: { turbopackFileSystemCacheForDev: false }` ao `next.config.ts`.
- **Instalação falha com `ENETUNREACH`**: rede sem IPv6. Use
  `NODE_OPTIONS="--dns-result-order=ipv4first" yarn install`.
- **Painel em "Atualização a cada 3 s" com Firebase configurado**: confira as variáveis `NEXT_PUBLIC_FIREBASE_*` e se o
  Authentication foi iniciado no console.
