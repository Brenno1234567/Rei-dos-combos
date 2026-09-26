# Documentação Técnica — Sistema de Cardápio Digital "Erva Doce AscanI Panificadora"

> Documento gerado a partir da leitura completa do código-fonte do projeto (Next.js 16 + React 19 + Drizzle ORM + Turso/libSQL).
> Objetivo: descrever o que cada página e rota de API faz, como o fluxo de dados funciona, e apontar pontos de melhoria.

---

## 1. Visão geral

É um sistema de cardápio digital para restaurante/padaria, acessado via QR Code nas mesas, com:

- **Área do cliente (sem login):** ver cardápio, montar carrinho, enviar pedido, acompanhar status.
- **Área interna (com login por PIN ou Google):** cozinha, atendimento/garçom, administração de produtos, usuários e configurações.
- Atualizações em tempo real via Pusher (novo pedido / status atualizado).
- Upload de imagens de produtos via Cloudinary.
- Banco de dados SQLite local (`dev.db`) ou Turso (libSQL) em produção, via Drizzle ORM.

### Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Estilo | Tailwind CSS 4 (tema customizado em `globals.css`) |
| Estado do carrinho | Zustand (com `persist` em localStorage) |
| Banco de dados | Drizzle ORM + libSQL (Turso em produção / `dev.db` em local) |
| Autenticação interna | Cookies httpOnly por cargo (`auth_admin`, `auth_cozinha`, `auth_atendente`) + PIN com bcrypt |
| Autenticação alternativa | Login Google (Firebase Auth) restrito a e-mails de uma allowlist |
| Tempo real | Pusher (channels) |
| Upload de imagens | Cloudinary |
| Ícones | lucide-react |

---

## 2. Estrutura de pastas (`src/`)

```
app/
  page.tsx                     → redireciona para /cardapio
  layout.tsx                   → layout raiz (fontes, metadata)
  login/page.tsx               → tela de login (PIN ou Google)
  cardapio/page.tsx            → cardápio do cliente (componente CardapioCliente)
  cardapio/[mesa]/page.tsx     → rota por mesa (ex: /cardapio/mesa-3)
  carrinho/page.tsx            → carrinho de compras do cliente
  orders/page.tsx              → "Meus Pedidos" do cliente (acompanhamento)
  atendimento/page.tsx         → painel do garçom/atendente (pedidos prontos)
  painel-pedidos/page.tsx      → painel da cozinha (kanban: pendente/preparando/pronto)
  historico-pedidos/page.tsx   → histórico completo de pedidos (admin/cozinha)
  admin/page.tsx               → CRUD de produtos do cardápio
  users/page.tsx               → gestão de colaboradores (PIN/cargo)
  settings/page.tsx            → configurações da loja (aberta/fechada, tempo de preparo)
  api/                         → rotas de API (ver seção 5)
components/CardProduto.tsx     → card de produto usado no cardápio
contexts/cartStore.ts          → store Zustand do carrinho (persistido)
db/
  schema.ts                    → definição das tabelas
  index.ts                     → conexão com o banco (Turso/libSQL)
  seed.ts                      → script de seed inicial
lib/
  auth.ts                      → helpers de autenticação/autorização
  login-rate-limit.ts          → limitador de tentativas de login
  produtos-cache.ts            → cache de produtos (Next.js unstable_cache)
  pusher.ts / pusher-server.ts → clientes Pusher (browser/servidor)
  firebase-client.ts           → login Google via Firebase
proxy.ts                       → middleware de proteção de rotas
```

---

## 3. Modelo de dados (`db/schema.ts`)

| Tabela | Campos principais | Descrição |
|---|---|---|
| `produtos` | id, nome, descricao, preco, categoria, status (Ativo/Inativo), imagem | Itens do cardápio |
| `pedidos` | id, mesa, cliente, status, observacao, total, criadoEm | Pedido feito pelo cliente |
| `itensPedido` | id, pedidoId, produtoNome, quantidade, precoUnitario | Itens de um pedido (nome/preço congelados no momento da compra, não referenciam mais o produto) |
| `configuracoes` | id, nomeRestaurante, statusLoja (bool), tempoPreparo | Configuração única da loja |
| `usuarios` | id, nome, cargo (admin/cozinha/atendente), pin (hash bcrypt) | Colaboradores internos |
| `tentativasLogin` | identificador (hash do IP), tentativas, bloqueadoAte, atualizadoEm | Controle de rate limit do login |

Estados possíveis de um pedido: `pendente → preparando → pronto → entregue`, ou `cancelado` a qualquer momento (a partir de "pendente").

---

## 4. Autenticação e controle de acesso

### Como funciona

- Login por PIN (4–8 dígitos numéricos) comparado via bcrypt contra todos os usuários cadastrados (`/api/auth/login`), ou
- Login via Google (Firebase), restrito a e-mails definidos em `GOOGLE_ADMIN_EMAILS` (`/api/auth/google`) — sempre vira cargo `admin`.
- Ao autenticar, é setado um cookie httpOnly com o nome do cargo: `auth_admin`, `auth_cozinha` ou `auth_atendente` (não existe um cookie de sessão único com ID de usuário — é só "qual cargo está logado neste navegador").
- `lib/auth.ts` expõe `requireAuth`, `requireAdmin`, `requireKitchen` para proteger rotas de API.
- `proxy.ts` (middleware) protege as páginas (não as APIs) redirecionando para `/login` quando necessário, conforme a tabela abaixo.

### Regras de acesso por rota (via `proxy.ts`)

| Rota | Quem acessa |
|---|---|
| `/admin`, `/users`, `/settings` | Somente `admin` |
| `/painel-pedidos`, `/historico-pedidos` | `admin` ou `cozinha` |
| `/atendimento` | `admin` ou `atendente` |
| `/cozinha` | Redireciona sempre para `/painel-pedidos` (rota antiga) |
| `/login` | Se já logado, redireciona para a home do cargo |
| `/cardapio`, `/carrinho`, `/orders` | Público (cliente final, sem login) |

### Rate limiting de login (`lib/login-rate-limit.ts`)

- Identifica o cliente por hash SHA-256 do IP (`x-forwarded-for` / `x-real-ip`).
- Após 5 tentativas falhas, bloqueia por 15 minutos.
- Cria a tabela `tentativas_login` em SQL puro na primeira execução (independente da migração via Drizzle).

---

## 5. Rotas de API (`app/api`)

### `POST /api/auth/setup`

Cria o primeiro administrador (PIN fixo `1234`), somente se ainda não existir nenhum usuário. Pode ser protegida por header `x-setup-secret` se a env `SETUP_SECRET` estiver definida.

### `POST /api/auth/login`

Recebe `{ pin }`. Aplica rate limit, compara com todos os usuários (bcrypt), seta cookie do cargo correspondente. Retorna `{ cargo, nome }`.

### `POST /api/auth/google`

Recebe `{ idToken }` do Firebase. Valida o token contra a API do Google (`identitytoolkit`), checa e-mail verificado + allowlist (`GOOGLE_ADMIN_EMAILS`), seta cookie `auth_admin`.

### `POST /api/auth/logout`

Limpa os três cookies de autenticação.

### `GET /api/produtos`

Lista produtos. Se o usuário autenticado for `admin`, retorna todos (inclusive inativos); senão, retorna só os com `status = "Ativo"`. Usa cache (`unstable_cache`, 5 min, tag `produtos`).

### `POST /api/produtos` 🔒 admin

Cria produto. Valida nome e preço. Usa imagem padrão (Unsplash) se não enviada. Invalida o cache de produtos.

### `PUT /api/produtos/[id]` 🔒 admin

Atualiza produto existente.

### `DELETE /api/produtos/[id]` 🔒 admin

Remove produto.

### `PUT /api/categorias` 🔒 admin

Renomeia uma categoria em massa (atualiza todos os produtos daquela categoria).

### `GET /api/pedidos`

Retorna todos os pedidos com seus itens. ⚠️ Não exige autenticação (ver seção de melhorias).

### `POST /api/pedidos`

Cria um pedido (usado pelo carrinho do cliente). Regras:

- Bloqueia se a loja estiver fechada (`configuracoes.statusLoja = false`).
- Exige ao menos 1 item, valida quantidade (1–99) e preço de cada item.
- Recalcula o total no servidor a partir do preço real do produto no banco (evita manipulação do preço pelo cliente).
- Valida que `mesa` seja no formato `Mesa N` ou `Balcão` (não aceita texto livre).
- Salva pedido + itens em uma transação.
- Dispara evento Pusher `novo-pedido` no canal `canal-restaurante`.

### `PATCH /api/pedidos` 🔒 admin/cozinha

Atualiza o status de um pedido (`pendente|preparando|pronto|entregue|cancelado`). Dispara evento Pusher `status-atualizado`.

### `DELETE /api/pedidos` 🔒 admin/cozinha

Exclui um pedido e seus itens (usado na tela de Histórico).

### `POST /api/pedidos/cancelar`

Permite o cliente cancelar seu próprio pedido, mas só se ainda estiver `pendente`. ⚠️ Não há verificação de que quem está cancelando é o dono do pedido — qualquer um que souber/adivinhar o `id` pode cancelar (ver melhorias).

### `GET /api/settings`

Retorna configuração da loja (aberta/fechada, tempo de preparo). Público.

### `POST /api/settings` 🔒 admin

Salva/atualiza a configuração (cria se não existir).

### `GET /api/usuarios` 🔒 admin

Lista colaboradores (sem o campo `pin`).

### `POST /api/usuarios` 🔒 admin

Cadastra colaborador. Valida cargo, impede criar um segundo `admin`, exige PIN numérico de 4–8 dígitos, faz hash com bcrypt.

### `DELETE /api/usuarios/[id]` 🔒 admin

Remove colaborador.

### `POST /api/upload`

Recebe um arquivo (`FormData`) e envia para o Cloudinary (pasta `cardapio`), retornando a URL segura. Sem autenticação e sem validação de tipo/tamanho de arquivo.

---

## 6. Fluxo do cliente (mesa)

1. Cliente escaneia o QR Code da mesa → abre `/cardapio/mesa-N` (existe um QR pré-gerado por mesa em `public/qr-codes/`).
2. `cardapio/[mesa]/page.tsx` valida o formato `mesa-N` e renderiza `CardapioCliente` com a mesa já definida.
3. O componente busca produtos (`/api/produtos`) e configurações (`/api/settings`) em paralelo.
4. Cliente filtra por categoria ou pesquisa, adiciona itens ao carrinho (Zustand + localStorage, chave `lumiere-cart`).
5. Vai para `/carrinho`, preenche nome e observação, escolhe "entregar na mesa" ou "retirar no balcão".
6. Ao finalizar, `POST /api/pedidos` cria o pedido; o ID retornado é salvo em `localStorage.meusPedidos`.
7. Cliente é redirecionado para `/orders`, que faz polling a cada 4s em `/api/pedidos` e filtra pelos IDs salvos localmente, mostrando o status atual (pendente/preparando/pronto/entregue/cancelado). Pode cancelar enquanto "pendente".

> Observação: acessar `/cardapio` diretamente (sem o segmento de mesa) mostra a tela "Acesse pelo QR Code da mesa", pois a página não lê `mesa` de `searchParams` (ver seção de melhorias, item 2).

---

## 7. Fluxo interno (equipe)

- Login em `/login` via PIN (ou Google, para admin).
- Redirecionamento pós-login conforme cargo: `cozinha` → `/painel-pedidos`, `admin` → `/admin`, `atendente` → `/cardapio` (ver observação abaixo).
- **Cozinha** (`/painel-pedidos`): kanban com 3 colunas (Novos/Em preparo/Prontos), atualizado em tempo real via Pusher, com botões para avançar o status. Também dá acesso a Equipe, Configurações e Cardápio (menu lateral/inferior).
- **Atendimento** (`/atendimento`): lista só os pedidos com status `pronto`, com botão "Entregar pedido" (muda para `entregue`), atualiza sozinho a cada 5s.
- **Administração** (`/admin`): CRUD completo de produtos (nome, descrição, preço, categoria, imagem via upload Cloudinary), e renomeação de categorias.
- **Usuários** (`/users`): cadastro/remoção de colaboradores e seus PINs, cada um com um cargo.
- **Configurações** (`/settings`): liga/desliga o recebimento de novos pedidos e define o tempo médio de preparo exibido no cardápio.
- **Histórico** (`/historico-pedidos`): lista todos os pedidos com filtro por status e opção de excluir definitivamente.

> Observação: o login de `atendente` redireciona para `/cardapio` (não para `/atendimento`) quando não há parâmetro `redirect` — provavelmente não é o comportamento pretendido (ver melhorias).

---

## 8. Integrações externas

| Serviço | Uso | Configuração |
|---|---|---|
| Turso / libSQL | Banco de dados principal | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (fallback: arquivo local `dev.db`) |
| Pusher | Tempo real (novo pedido / status atualizado) | `PUSHER_APP_ID`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_CLUSTER` |
| Cloudinary | Upload de imagens de produtos | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Firebase Auth (Google) | Login alternativo do admin | `NEXT_PUBLIC_FIREBASE_*`, `GOOGLE_ADMIN_EMAILS` |

Todas as integrações são "opcionais/degradadas com segurança": se as envs não estiverem definidas, `pusherServer`/`pusherClient` ficam `null` e o app continua funcionando sem tempo real; o Firebase lança erro amigável se não configurado.

---

## 9. Pontos de melhoria identificados

> ⚠️ Seção revisada em Ago/2026 para refletir o estado atual do código. Os pontos de segurança
> abaixo, presentes em uma versão anterior desta documentação, **já foram corrigidos**:
> `GET /api/pedidos` agora exige a lista de IDs do próprio cliente (não lista tudo publicamente),
> `POST /api/pedidos/cancelar` valida um token de cancelamento por pedido, `/api/upload` valida
> tipo e tamanho do arquivo, e o PIN de setup do primeiro admin é gerado aleatoriamente (não é
> mais fixo `1234`). Não use versões antigas deste arquivo como checklist sem conferir com o código.

### 🔴 Segurança (prioridade alta)

1. **PINs são só numéricos de 4–8 dígitos** — espaço de busca pequeno; bcrypt + rate limit ajudam, mas vale considerar PINs maiores ou 2FA para o `admin`.
2. **Cookies de autenticação não carregam um ID de sessão/usuário, só o cargo** — não dá para saber quem fez uma ação (auditoria fica difícil), nem revogar o acesso de uma pessoa específica sem remover o cargo todo.
3. **Chave de service account do Google/Firebase (`erva-doce-credenciais.json`) não é usada pelo código e ficava fora do `.gitignore`** — corrigido: arquivo agora ignorado pelo git. Se essa chave já circulou (ex.: enviada em um zip), revogue-a no console do Google Cloud/Firebase e gere uma nova.

### 🟠 Bugs / inconsistências

1. **`app/cardapio/page.tsx` (rota raiz) ignora o parâmetro `?mesa=`** vindo do redirect da Home (`app/page.tsx`) — só funciona de fato via `/cardapio/mesa-N`. Isso faz o link gerado pela Home (`/cardapio?mesa=...`) cair na tela de "acesse pelo QR Code".
2. **`users/page.tsx` compara `cargo` com valores capitalizados** (`"Administrador"`, `"Cozinha"`) mas a API sempre retorna em minúsculo (`"admin"`, `"cozinha"`, `"atendente"`) — os badges coloridos de cargo nunca vão bater certo (sempre cai no estilo "Atendente"/azul).
3. **Login de atendente sem `redirect` explícito cai em `/cardapio`** em vez de `/atendimento` (só `cozinha` e `admin` têm destino próprio em `login/page.tsx`).
4. ~~Trechos de texto com encoding corrompido~~ — corrigido: `login-rate-limit.ts` resalvo em UTF-8 e o BOM de `carrinho/page.tsx` foi removido. Vale checar `auth/google/route.ts` também, se ainda houver mojibake lá.
5. **A tabela `tentativas_login` é criada tanto via `db/schema.ts` (Drizzle) quanto via `CREATE TABLE IF NOT EXISTS` manual em `login-rate-limit.ts`** — redundante, pode gerar divergência de schema se um dos dois mudar sem o outro. Mantido por segurança (garante a tabela mesmo sem migração aplicada), mas o ideal é ter só uma fonte de verdade.

### 🟡 Qualidade / manutenibilidade

1. **Não há testes automatizados no projeto.**
2. **`GET /api/pedidos` retorna a tabela inteira sem paginação/filtro por data** — tende a ficar lento conforme o histórico cresce (usado por `historico-pedidos`, `orders`, `painel-pedidos` e `atendimento`).
3. **Várias páginas fazem polling (4s, 5s) em vez de depender só do Pusher** — funciona como reforço, mas gera tráfego extra; poderia usar só Pusher + um fallback mais espaçado.
4. **Uso de `dev.db` (SQLite local) como fallback** quando `TURSO_DATABASE_URL` não está definida — em ambientes serverless (ex. Vercel) o filesystem é efêmero, então isso não deve ser usado em produção sem avisar claramente o time.
5. **Imagem padrão de produto aponta para uma URL fixa do Unsplash** (dependência externa) — se o link cair, todos os produtos sem imagem quebram ao mesmo tempo; melhor usar um asset local.
6. **`carrinho/page.tsx` e outras telas usam `alert()`/`confirm()` do navegador** para feedback — funciona, mas prejudica a experiência (poderia usar toasts/modais).

### 🟢 Pontos positivos a manter

- Separação clara entre área pública (cliente) e área interna por cargo.
- Total do pedido sempre recalculado no servidor a partir do preço real (evita fraude de preço vindo do cliente).
- Uso de transação ao salvar pedido + itens.
- Cache de produtos com invalidação por tag ao alterar dados.
- Rate limiting de login com bloqueio temporário.
- Integrações externas com fallback seguro quando não configuradas (não derruba o app).

---

## 10. Variáveis de ambiente usadas (nomes, sem valores)

```
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
PUSHER_APP_ID
NEXT_PUBLIC_PUSHER_KEY
PUSHER_SECRET
NEXT_PUBLIC_PUSHER_CLUSTER
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
GOOGLE_ADMIN_EMAILS
SETUP_SECRET (opcional, protege /api/auth/setup)
```

---

## 11. Scripts disponíveis (`package.json`)

| Script | Ação |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` / `start` | Build e produção |
| `npm run db:generate` / `db:push` / `db:migrate` | Gerenciamento de migrações Drizzle |
| `npm run db:seed` | Popula produtos e configuração inicial |
| `npm run db:setup` | `db:push` + `db:seed` |
