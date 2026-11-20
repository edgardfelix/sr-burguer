# Plano de implementação: SR Burguer

Documento de trabalho. Registra as decisões tomadas antes do código e a ordem de execução.

## 1. Material real disponível (pasta `assets/`)

| Material | O que é | Limitação | Uso |
| --- | --- | --- | --- |
| `logo/logo.jpeg` | Logo do perfil, 191x167 px | Baixa resolução | Não usado: o selo sai do cartão final do vídeo |
| `logo/logo-hd.png` | Cartão final do vídeo (quadro de 45,5 s) recortado em 720x720 | Quadro de vídeo, não vetor | Selo circular; tela, favicon, ícones e imagem de compartilhamento |
| `produtos/cardapio.jpeg` | Post do cardápio no Instagram (720x1640) | Lanches em miniatura de ~200 px | Recortes dos 4 lanches em WebP; nomes, descrições e preços avulso/combo viram o cardápio inicial |
| `produtos/promocao.jpeg` | Post da promoção (720x1640) | | Recorte dos 2 lanches; promoção de 2 lanches + 2 batatas + 2 refris 200 ml por R$ 59,99; refris Pepsi e Guaraná |
| `videos/video-srburguer.mp4` | Vídeo vertical 720x1280, 47 s, chapa e montagem reais | Trocas de cena em "chicote" borrado; cartão do logo a partir de 43,9 s | Loop de 14,9 s em 360x640 sem áudio (montagem, smash, cheddar), pôster nítido e quadro do lanche montado |
| `info/perfil-instagram.jpeg` | Perfil do Instagram | | Fonte de dados (@sr_burguer_01, "hamburgueria DELIVERY em Itapevi", WhatsApp (11) 91781-2791) |

Pendências do cliente (listadas no README): logo em vetor, taxa de entrega, chave Pix, quais lanches entram na
promoção e fotos reais dos lanches em alta.

## 2. Arquitetura

- **Next.js 16 (App Router) + React 19 + TypeScript + styled-components 6.6** (RSC nativo, tema por variáveis CSS).
- **API em Express 5** montada em `src/pages/api/[[...route]].ts` (Pages Router só para a API; páginas no App Router).
  Toda escrita no banco passa pela API, com validação Zod.
- **Firebase Realtime Database (Spark)**:
  - O servidor usa o Admin SDK (conta de serviço) e ignora as regras.
  - O painel recebe um *custom token* com a claim `admin: true` e escuta `/orders` em tempo real.
  - Regras: cliente não escreve nada; `catalog` e `settings` têm leitura pública; pedidos só para admin.
  - Imagens enviadas pelo painel ficam em `/media` (base64, já comprimidas no navegador) e são servidas por
    `/api/media/:id` com cache imutável na CDN. Motivo: o Cloud Storage exige plano Blaze desde 2024.
- **Driver local** (arquivo `.data/db.json`) quando o Firebase não está configurado em desenvolvimento.
  Permite testar o fluxo completo (pedido, painel, alerta sonoro) antes de criar o projeto no Firebase.
  O painel troca os listeners do Firebase por *polling* nesse modo.
- **Página pública com ISR**: renderizada no servidor a partir do banco, revalidada sob demanda
  (`res.revalidate('/')`) quando o painel altera cardápio ou loja. O status aberto/fechado é recalculado no
  navegador a cada minuto e confirmado por `/api/store/status`.
- **Login do painel**: e-mail + senha (hash scrypt na variável de ambiente) + CAPTCHA matemático em SVG
  distorcido (token HMAC sem estado, nonce de uso único gravado no banco), honeypot e bloqueio por
  tentativas (5 em 15 min por IP). Sessão em cookie httpOnly assinado (JWT HS256, 12 h).
- **Reset diário**: Vercel Cron `0 7 * * *` (07:00 UTC = 04:00 em São Paulo) chama `/api/cron/reset`.
  Pedidos do dia vão para `/archive/{data}` (retenção de 30 dias) e o resumo para `/reports/{data}`.
  O painel confere a data de negócio ao abrir e a cada minuto e dispara o reset se o cron não rodou.
  Data de negócio = data em São Paulo de (agora - 4 h).

## 3. Direção visual

- Tipo de negócio: lugar (restaurante de bairro). Fotos reais lideram; nada de efeitos.
- Paleta da própria marca: papel creme (fundo), tinta marrom-quase-preta (texto e botão principal),
  âmbar do "BURGER" do logo (destaques), vermelho ketchup (promoção), verde (aberto). Rodapé como faixa escura.
- Tipografia: Besley (títulos, serifa com toque slab que conversa com o letreiro do logo) + Albert Sans (interface).
- Raio pequeno (4 a 8 px), nunca pílula. Ícones Lucide. Sem travessões, sem emojis, sem roxo.
- Movimento: entrada única do hero, hover com `@media (hover: hover)`, press `scale(0.97)`, sheets com curva
  iOS, sem fade-in de seção no scroll. `prefers-reduced-motion` respeitado.
- Som: Web Audio sintetizado (sem arquivos), volume baixo, com botão para silenciar.

## 4. Ordem de execução

1. Scaffold, dependências e configs (TS, ESLint, Vitest, Next, Vercel).
2. Pipeline de assets (sharp + ffmpeg) e conferência visual.
3. Domínio puro com testes: dinheiro, horário/status, data de negócio, pedido, WhatsApp, CAPTCHA, senha.
4. Servidor: env, drivers (Firebase e local), serviços, rotas Express, cron.
5. Design system (tokens, global, componentes base).
6. Cardápio público: header, hero, categorias, itens, sheet do produto, carrinho, checkout, sucesso.
7. Painel: login, tutorial, pedidos em tempo real, cardápio, promoções, loja.
8. SEO e legal: metadata, JSON-LD, sitemap, robots, llms.txt, OG, ícones, 404, páginas legais, aviso de cookies.
9. Verificação: typecheck, lint, testes, build, servidor local, screenshots em 390/768/1440.
10. Documentação (README) e relatório final.

## 5. Segunda etapa (16/11/2026): desempenho, bebida dos combos e acompanhamento

- **LCP**: o pôster do hero sai do componente cliente e vai para o servidor (`next/image` com `preload`, blur do import
  estático, sem animação de opacidade). O vídeo vira import dinâmico montado no tempo ocioso depois do `load`.
  Painéis do fluxo de compra, jogo e sonner saem do pacote inicial (`next/dynamic`, baixados no ocioso ou no primeiro toque).
  As fotos do cardápio deixam de ter prioridade (disputavam banda com o pôster).
- **Prefetch**: abas do painel com `prefetch` explícito (rotas dinâmicas não são pré-carregadas por padrão no Next 16);
  links de volta ao cardápio no rodapé, nas páginas legais e no 404 também.
- **Firebase no painel**: SDK importado em paralelo no tempo ocioso, `preconnect` emitido pelo layout do servidor e
  consulta de reserva a cada 3 s até o primeiro retorno do listener.
- **Bebida dos combos**: campo `drinkChoice` (none/optional/required) no item e `comboDrink` nas bebidas.
  As opções são produtos reais, então pausar uma lata tira ela da escolha. Validação repetida no servidor (`priceOrder`),
  linha do carrinho separada por bebida, nome gravado no item do pedido. Dados antigos recebem padrão na normalização.
- **Acompanhamento**: `trackToken` aleatório no pedido e `GET /api/orders/:id/tracking` com resposta mínima (sem dados
  pessoais). Consulta adaptativa (8 s aberto, 30 s fechado, pausa em aba escondida, para no status final), pedido salvo
  no aparelho até o fim do dia. Optou-se por consulta à API em vez de listener público no Firebase para não exigir
  mudança de regras nem expor um caminho legível do banco.
- **Minijogo**: motor puro testado (`engine.ts`) + desenho em canvas (`draw.ts`) + componente com `requestAnimationFrame`.
  Gênero de "pegar itens que caem", com regras e arte próprias da marca.

## 6. Terceira etapa (20/11/2026): migração para a SR Burguer

Cópia do sistema da Bigodin Burger para a SR Burguer, sem mudar arquitetura, layout, fluxo de combo/bebida, minijogo ou
lógica do painel. Só dados, mídias, textos da marca e ambiente:

- **Repositório e ambiente novos**: Git reiniciado (sem o histórico anterior), repositório `sr-burguer` no GitHub, projeto
  Firebase próprio e projeto `srburguer` na Vercel (`https://srburguer.vercel.app`). Segredos de sessão, cron e hash da
  senha do painel gerados de novo; nada aponta para o projeto anterior.
- **Cardápio inicial**: 11 itens dos posts do Instagram (4 lanches com carne de 120 g, 4 combos com batata e refri 200 ml,
  promoção de 2 lanches, Pepsi e Guaraná 200 ml a R$ 6,00 como opções de bebida dos combos).
- **Loja**: WhatsApp 5511917812791, Instagram sr_burguer_01, terça a domingo das 18:00 às 23:30, só delivery.
- **Loja sem balcão**: rua, número e bairro vazios fazem o site mostrar "Delivery em Itapevi/SP" no hero, na seção de
  localização, no rodapé, no llms.txt e nos dados estruturados (sem `streetAddress`). O schema do painel só exige o endereço
  completo quando a retirada está ligada; o servidor continua recusando retirada com ela desligada.
- **Testes**: atualizados para o novo cardápio; o teste de horário passou a usar um horário de referência próprio, sem
  depender do horário cadastrado da loja; novo teste para a recusa de retirada na loja só de delivery.
