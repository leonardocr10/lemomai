# Lenom.AI — site institucional e comercial

Site da **Lenom.AI**, empresa de desenvolvimento de sites, sistemas sob medida, landing pages, e-commerce, automação, suporte e soluções SaaS.

- **Stack:** Node.js 22.13+ · Express 5 · EJS · SQLite nativo (`node:sqlite`) · Sequelize/MySQL opcional
- **Dados:** banco interno SQLite (padrão, com painel `/admin`), mock ou MySQL, alternados por uma variável de ambiente, sem alterar views ou controllers
- **Front-end:** HTML server-rendered + CSS com design tokens + JavaScript em módulos ES (sem framework e sem Bootstrap)

---

## Início rápido

```bash
npm install
cp .env.example .env
npm run dev
```

No Windows, basta dar dois cliques em **`iniciar.bat`**: ele verifica o Node.js, instala as dependências na primeira execução, cria o `.env`, abre o navegador e sobe o servidor em modo desenvolvimento. Para modo produção (build + `npm start`), rode `iniciar.bat prod`.

Acesse **http://localhost:3000**. Com `DATA_DRIVER=sqlite` (padrão) o site cria sozinho o banco interno `storage/lenom.db` na primeira execução, já com o conteúdo de exemplo. O painel fica em **http://localhost:3000/admin** (veja [Painel administrativo](#painel-administrativo)).

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor com recarga automática (nodemon) |
| `npm start` | Servidor em modo normal |
| `npm test` | Testes (unitários + HTTP) com `node --test` |
| `npm run build` | Minifica e empacota CSS/JS em `public/dist` (usado quando `NODE_ENV=production`) |
| `npm run images` | Regenera logos, favicons, hero e imagem Open Graph a partir de `assets-src/` |
| `npm run placeholders` | Regenera as ilustrações SVG do portfólio |
| `npm run db:create` / `db:migrate` / `db:seed` / `db:reset` | Comandos do MySQL (ver abaixo) |

---

## Fonte de dados: SQLite, mock ou MySQL

A escolha acontece em **um único lugar**: `src/repositories/index.js`, a partir de `DATA_DRIVER` no `.env`.

```js
const driver = config.dataDriver; // 'sqlite' | 'mock' | 'mysql'
module.exports = require(`./${driver}`);
```

```
Views → Controllers → Services → repositories/index.js ─┬─ repositories/sqlite → storage/lenom.db (padrão, editável pelo /admin)
                                                         ├─ repositories/mock   → src/data/mock/*.mock.js (somente leitura)
                                                         └─ repositories/mysql  → Sequelize → MySQL
```

No modo `sqlite`, planos, FAQ, depoimentos, dados da empresa e leads ficam no banco interno; serviços, portfólio e seções continuam vindo de `src/data/mock`. O antigo `USE_MOCK_DATA=true/false` ainda funciona (equivale a `mock`/`mysql`).

Os repositórios expõem a mesma interface (`findAll`, `findBySlug`, `get`, `getAll`, `create`) e devolvem objetos no mesmo formato. Por isso, trocar a fonte de dados não exige mudar nenhuma view, controller ou service.

### Configurar o MySQL

1. Tenha um MySQL 8 (ou 5.7+) rodando.
2. No `.env`, preencha:
   ```env
   DATA_DRIVER=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=lenom_ai
   DB_USER=root
   DB_PASSWORD=sua_senha
   ```
3. Crie o banco, as tabelas e o conteúdo inicial:
   ```bash
   npm run db:create
   npm run db:migrate
   npm run db:seed
   ```
4. Rode `npm run dev`. O log mostrará `dados: mysql`.

O seed (`database/seeds/`) lê os **mesmos arquivos de mock**, então o site mostra o mesmo conteúdo nos dois modos. Se preferir criar o banco manualmente:

```sql
CREATE DATABASE lenom_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Se o servidor não conseguir conectar ao MySQL, ele encerra com uma mensagem clara. Para voltar ao banco interno, use `DATA_DRIVER=sqlite`.

---

## Estrutura

```
├── server.js                  # inicialização (conexão MySQL quando necessário, graceful shutdown)
├── src/
│   ├── app.js                 # Express: segurança, compressão, estáticos, rotas, erros
│   ├── config/                # .env centralizado, banco, navegação, opções dos formulários
│   ├── controllers/           # pages, leads (formulários), api, seo (sitemap/robots/manifest)
│   ├── routes/                # web.routes.js e api.routes.js
│   ├── services/              # content, company, lead, email (regras de negócio)
│   ├── repositories/          # index.js (escolha) + mock/ + mysql/
│   ├── models/                # models Sequelize (carregados só no modo MySQL)
│   ├── validators/            # validação server-side (zod)
│   ├── middlewares/           # segurança, CSRF, upload, locals, erros
│   ├── utils/                 # whatsapp, seo/schema, formatação, logger, cache, sanitização
│   └── data/mock/             # dados iniciais
├── views/
│   ├── layouts/main.ejs
│   ├── partials/              # head, header, footer, cookie banner, seções da home
│   ├── components/            # componentes reutilizáveis
│   └── pages/                 # páginas, legais e de erro
├── public/
│   ├── css/                   # tokens, base, components, sections, pages, animations
│   ├── js/                    # main.js + modules/
│   ├── images/                # brand, hero, og, portfolio
│   ├── icons/sprite.svg       # ícones SVG
│   └── uploads/               # reservado para mídias públicas do futuro painel
├── database/
│   ├── migrations/            # 9 tabelas
│   └── seeds/
├── storage/                   # anexos dos orçamentos, leads em modo mock e logs (fora de public/)
├── assets-src/                # arquivos originais da marca (banner.webp e brand/)
├── scripts/                   # build, otimização de imagens, placeholders
└── tests/
```

---

## Páginas e rotas

| Rota | Página |
|---|---|
| `/` | Home: Hero, Serviços, Planos, Diferenciais, Portfólio, Como funciona, Depoimentos, CTA, FAQ, Contato |
| `/servicos` · `/servicos/:slug` | Serviços e detalhe de cada serviço |
| `/planos` | Planos SaaS (Essencial, Profissional, Gestão 360, Enterprise) + planos de projeto |
| `/portfolio` · `/portfolio/:slug` | Portfólio e estudo de caso (desafio, solução, tecnologias, screenshots, resultados) |
| `/sobre` | Institucional, missão, visão e valores |
| `/contato` | Formulário de contato |
| `/orcamento` | Orçamento completo com anexo (aceita `?tipo=` e `?plano=` para pré-seleção) |
| `/politica-de-privacidade` · `/termos-de-uso` · `/politica-de-cookies` | Páginas legais |
| `/sitemap.xml` · `/robots.txt` · `/site.webmanifest` | SEO, gerados dinamicamente |

### API

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/services` · `/api/services/:slug` | Serviços |
| GET | `/api/plans?category=project\|saas` | Planos |
| GET | `/api/portfolio` · `/api/portfolio/:slug` | Portfólio |
| GET | `/api/testimonials` | Depoimentos |
| GET | `/api/faq` | FAQ |
| GET | `/api/csrf-token` | Token CSRF para clientes da API |
| POST | `/api/contact` | Lead de contato (JSON ou urlencoded) |
| POST | `/api/quote` | Lead de orçamento (multipart, com anexo opcional) |

As respostas seguem o formato `{ ok: true, data }` ou `{ ok: false, message, errors }`, com `errors` indexado pelo nome do campo.

---

## Formulários e leads

- **Validação no cliente** (HTML5 + `public/js/modules/forms.js`, com mensagens em português e máscara de telefone) e **validação no servidor** (`src/validators/lead.validator.js`). O servidor sempre revalida.
- **Sem JavaScript**, os formulários fazem POST para `/contato` e `/orcamento` e são renderizados de novo com os erros. **Com JavaScript**, são enviados via `fetch` para a API e o resultado aparece em um toast.
- **Persistência:** no modo `sqlite` (padrão), os leads vão para o banco interno e aparecem em `/admin/leads`. No modo mock, vão para `storage/leads.json` (importado uma vez ao criar o banco interno). No modo MySQL, vão para a tabela `leads`.
- **Anexos:** ficam em `storage/uploads/`, fora da pasta pública. Há lista de extensões e MIME types permitidos e limite de tamanho (`UPLOAD_MAX_MB`).
- **Anti-spam:** campo honeypot (o bot recebe um sucesso falso e nada é salvo) e rate limit por IP.
- **E-mail:** `EmailService` com `MAIL_DRIVER=log` (padrão, apenas registra no log) ou `smtp` (nodemailer). Envia um aviso para `MAIL_TO_LEADS` e uma confirmação ao cliente.

## WhatsApp

O número vem de **company settings** (`company.mock.js` ou a tabela `company_settings`). O link é montado uma única vez em `company.service.js` com `buildWhatsAppUrl()` (`src/utils/whatsapp.js`) e reaproveitado no header, na home, no botão flutuante, no CTA, no contato e no footer.

## SEO

- `title`, `meta description`, `canonical`, Open Graph e Twitter Card em todas as páginas (`src/utils/seo.js` → `views/partials/head.ejs`)
- JSON-LD: `Organization` e `ProfessionalService` (LocalBusiness) em todas as páginas, `Service`/`ItemList`, `OfferCatalog`, `FAQPage`, `BreadcrumbList` e `CreativeWork` conforme a página
- `sitemap.xml` com serviços e projetos gerados automaticamente. Em ambiente diferente de produção, o `robots.txt` bloqueia a indexação
- Favicons, apple-touch-icon e web manifest

**Importante:** em produção, defina `APP_URL` com o domínio real, porque ele é usado nas URLs canônicas, no Open Graph e no sitemap.

## Segurança

Helmet com CSP restritiva (sem scripts inline), rate limit nos formulários e na API, proteção CSRF (double-submit com cookie assinado), validação e sanitização das entradas, ORM com consultas parametrizadas, anexos fora da pasta pública, limites no tamanho do corpo das requisições, `x-powered-by` desativado e segredos no `.env`. Em produção, `COOKIE_SECRET` é obrigatório.

## Performance

AVIF/WebP com fallback via `<picture>` e `srcset`, `loading="lazy"` e `decoding="async"`, preload da imagem do hero e do logo, compressão gzip, CSS/JS minificados com hash e cache imutável (`npm run build`), cache de 7 dias para estáticos em produção e cache em memória para configurações e seções.

## Acessibilidade

Link "pular para o conteúdo", foco visível, labels em todos os campos, `aria-invalid`/`aria-describedby` nos erros, menu mobile com `aria-expanded` e fechamento com Esc, acordeão com navegação por setas, toasts com `aria-live`, `alt` nas imagens, contraste adequado e `prefers-reduced-motion` respeitado.

## Analytics e cookies

Defina `GA_MEASUREMENT_ID` e/ou `META_PIXEL_ID` no `.env`. Os scripts **só carregam depois do consentimento** dado no banner de cookies (categorias análise e marketing). A CSP libera os domínios automaticamente quando os IDs existem. Os eventos de conversão rastreados são `generate_lead`/`Lead` (envio de formulário) e `contact` (clique no WhatsApp).

## Design system

- Tokens em `public/css/tokens.css`: `--primary` (verde #5DBB46), `--primary-strong` (verde para texto), `--primary-dark` (petróleo #0F2D4A), `--secondary` (verde claro #6FD157), `--accent` (verde-água #1FA6A0), `--navy`, `--background`, `--surface`, `--text`, `--muted`, `--border`, além de gradientes, sombras, raios e espaçamentos. Nenhuma cor fica espalhada fora dos tokens.
- Tipografia: **Inter** no texto e **Lexend** (bold, espaçamento -3%) nos títulos, conforme o manual da marca Lenom.AI.
- Componentes (`views/components/`): Button, Badge, SectionTitle, ServiceCard, PricingCard, PortfolioCard, TestimonialCard, FaqAccordion, ContactForm, Picture, Breadcrumbs, PageHero, WhatsAppButton. Header, Hero e Footer ficam em `views/partials/`. Modal (preferências de cookies) e Toast são controlados por `public/js/modules/`.
- Responsividade: layout amplo no desktop, 2 colunas no tablet e 1 coluna no mobile. Os planos viram carrossel com scroll-snap no celular, e a imagem do hero vai para baixo do texto.

## Marca

Os arquivos originais ficam em `assets-src/` e `npm run images` gera:

| Arquivo | Uso |
|---|---|
| `images/brand/logo-horizontal.*` | logo colorido para fundos claros (header) |
| `images/brand/logo-dark.*` | símbolo colorido + texto branco para fundos escuros (footer) |
| `images/brand/logo-white.*` | versão monocromática branca |
| `images/brand/logo-symbol.*` | apenas o símbolo "L" (fundos claros) |
| `images/brand/logo-symbol-dark.*` | apenas o símbolo "L" (fundos escuros) |
| `favicon-*.png`, `apple-touch-icon.png`, `icons/icon-*.png` | favicons e PWA |

Para trocar a marca, substitua os arquivos em `assets-src/brand/` mantendo os nomes e rode `npm run images`.

---

## Antes de publicar

- [ ] Definir `ADMIN_PASSWORD` no `.env` (obrigatório em produção para ativar o `/admin`)
- [ ] Trocar telefone, WhatsApp, e-mail e redes em **/admin → Empresa**
- [ ] **Substituir os depoimentos ilustrativos** em **/admin → Depoimentos** por depoimentos reais e autorizados
- [ ] Trocar as ilustrações SVG do portfólio (`public/images/portfolio/`) por screenshots reais
- [ ] Revisar os textos legais com um profissional (política de privacidade, termos e cookies)
- [ ] Definir `NODE_ENV=production`, `APP_URL`, `COOKIE_SECRET` e `TRUST_PROXY=true` (se houver proxy reverso)
- [ ] Configurar SMTP (`MAIL_DRIVER=smtp`) e o destinatário dos leads
- [ ] Rodar `npm run build`

## Painel administrativo

O painel usa o **Tabler** (Bootstrap 5) com ícones Tabler e **Cropper.js** para recorte, servidos localmente de `node_modules` em `/vendor/*` (sem CDN). Todas as listas têm busca, ordenação por coluna, paginação (10/25/50) e ações em massa (ativar, desativar, excluir; nos leads, mudar status). O envio de imagens aceita arrastar e soltar, mostra prévia e dimensões, avisa quando a proporção foge do ideal e permite recortar no navegador (3:1 no desktop; 4:5, 1:1 ou livre no celular).

Acesse **/admin**. O administrador é criado na primeira visita com `ADMIN_USER` e `ADMIN_PASSWORD` do `.env`:

- **Desenvolvimento:** se `ADMIN_PASSWORD` estiver vazio, o acesso inicial é `admin` / `admin` (aparece um aviso no log).
- **Produção:** sem `ADMIN_PASSWORD`, o painel fica desativado (responde 404). Nunca há senha padrão no ar.
- Depois do primeiro acesso, troque a senha em **/admin → Trocar senha**. Mudar o `.env` depois disso não altera a senha já criada.

| Tela | O que faz |
|---|---|
| Banners da home | Carrossel do topo da home: imagem 3:1 (ideal 2000×667 px), imagem opcional para celular (ex.: 1080×1350 px; sem ela o banner não aparece no celular), link, texto alternativo, ordem e publicação. Sem banners ativos, a home volta a mostrar o hero de texto |
| Planos e preços | Nome, preço, tipo de cobrança, itens inclusos, selo, destaque, ordem e se aparece no site |
| FAQ | Perguntas e respostas, ordem e publicação |
| Depoimentos | Autor, cargo, empresa, texto, nota, ordem e publicação |
| Empresa | Telefone, WhatsApp, e-mail, redes sociais, endereço e horário |
| Leads | Contatos e orçamentos recebidos, filtro e mudança de status (novo, em contato, fechado, descartado) |
| Trocar senha | Exige a senha atual e encerra as outras sessões |

Ao salvar, o site reflete a mudança na hora (o cache é limpo). As imagens enviadas ficam em `public/uploads/banners/` (fora do git; inclua essa pasta no backup junto com `storage/lenom.db`).

**Segurança:** senha com hash `scrypt`, sessão em cookie assinado e `httpOnly` válida por 8 horas, proteção CSRF em todos os formulários, limite de 10 tentativas de login erradas por IP a cada 15 minutos e páginas marcadas como `noindex` (o `robots.txt` também bloqueia `/admin`).

**Banco:** o arquivo `storage/lenom.db` fica fora do git. Para fazer backup, copie o arquivo com o servidor parado. Apagar o arquivo recria o banco com o conteúdo de exemplo.

**Banner animado:** a tela de login mostra o nome "Lenom.AI" sendo digitado. Uma versão avulsa, em arquivo único, está em `assets-src/banner-lenom.html` (abra direto no navegador).

## Publicar no servidor (Ubuntu + Nginx)

Os scripts em `deploy/servidor/` instalam a Lenom.AI **ao lado** das aplicações que já estão no servidor (ex.: Cassiano3D na porta 3000) — nenhuma delas é parada ou alterada, e os sites existentes no Nginx não são tocados. A Lenom.AI roda como serviço systemd `lenom-ai` (usuário `lenom`, Node 22 em `/opt/node22`, porta interna 3100) com um site próprio no Nginx. Rode como root:

```bash
git clone https://github.com/leonardocr10/lemomai.git ~/lenom-deploy
cd ~/lenom-deploy/deploy/servidor
bash 1-instalar.sh                       # instala e liga: http://IP-DO-SERVIDOR:8080
bash 3-usar-dominio.sh seudominio.com.br # quando tiver domínio (com HTTPS grátis)
```

| Script | O que faz |
|---|---|
| `1-instalar.sh` | Node 22, usuário `lenom`, código em `/var/www/lenom-ai`, `npm ci`, build, `.env` de produção, serviço systemd e site no Nginx na porta 8080 |
| `2-atualizar.sh` | Atualiza com o que estiver no `main` (copia o banco antes) e reinicia só a Lenom.AI |
| `3-usar-dominio.sh dominio` | Troca o acesso por IP:8080 pelo domínio, com HTTPS via Let's Encrypt |

Portas diferentes: `APP_PORT=3200 PUBLIC_PORT=8081 bash 1-instalar.sh`. Logs: `journalctl -u lenom-ai -f`.

Sem HTTPS (`APP_URL` com `http://`), os cookies não são marcados como `Secure` para o login e os formulários funcionarem; com `https://` eles passam a ser `Secure` e o HSTS é ativado.
