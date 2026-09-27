# LC Serviços — site institucional e comercial

Site da **LC Serviços**, empresa de desenvolvimento de sites, sistemas sob medida, landing pages, e-commerce, automação, suporte e soluções SaaS.

- **Stack:** Node.js 18+ · Express 5 · EJS · Sequelize · MySQL
- **Dados:** mock (padrão) ou MySQL, alternados por uma variável de ambiente, sem alterar views ou controllers
- **Front-end:** HTML server-rendered + CSS com design tokens + JavaScript em módulos ES (sem framework e sem Bootstrap)

---

## Início rápido

```bash
npm install
cp .env.example .env
npm run dev
```

No Windows, basta dar dois cliques em **`iniciar.bat`**: ele verifica o Node.js, instala as dependências na primeira execução, cria o `.env`, abre o navegador e sobe o servidor em modo desenvolvimento. Para modo produção (build + `npm start`), rode `iniciar.bat prod`.

Acesse **http://localhost:3000**. Com `USE_MOCK_DATA=true` (padrão) o site abre sem banco de dados.

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

## Alternar entre mock e MySQL

A escolha acontece em **um único lugar**: `src/repositories/index.js`.

```js
const driver = config.useMockData ? 'mock' : 'mysql';
module.exports = require(`./${driver}`);
```

```
Views → Controllers → Services → repositories/index.js ─┬─ repositories/mock  → src/data/mock/*.mock.js
                                                         └─ repositories/mysql → Sequelize → MySQL
```

Os dois repositórios expõem a mesma interface (`findAll`, `findBySlug`, `get`, `getAll`, `create`) e devolvem objetos no mesmo formato. Por isso, trocar a fonte de dados não exige mudar nenhuma view, controller ou service.

### Configurar o MySQL

1. Tenha um MySQL 8 (ou 5.7+) rodando.
2. No `.env`, preencha:
   ```env
   USE_MOCK_DATA=false
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=lc_servicos
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
CREATE DATABASE lc_servicos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Se o servidor não conseguir conectar ao MySQL, ele encerra com uma mensagem clara. Para voltar ao modo mock, use `USE_MOCK_DATA=true`.

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
├── assets-src/                # arquivos originais da marca (banner e logo)
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
- **Persistência:** no modo mock, os leads vão para `storage/leads.json`. No modo MySQL, vão para a tabela `leads`.
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

- Tokens em `public/css/tokens.css`: `--primary`, `--primary-dark`, `--secondary`, `--navy`, `--background`, `--surface`, `--text`, `--muted`, `--border`, além de gradientes, sombras, raios e espaçamentos. Nenhuma cor fica espalhada fora dos tokens.
- Tipografia: **Inter** no texto e **Plus Jakarta Sans** nos títulos, para ficar próximo da headline do banner.
- Componentes (`views/components/`): Button, Badge, SectionTitle, ServiceCard, PricingCard, PortfolioCard, TestimonialCard, FaqAccordion, ContactForm, Picture, Breadcrumbs, PageHero, WhatsAppButton. Header, Hero e Footer ficam em `views/partials/`. Modal (preferências de cookies) e Toast são controlados por `public/js/modules/`.
- Responsividade: layout amplo no desktop, 2 colunas no tablet e 1 coluna no mobile. Os planos viram carrossel com scroll-snap no celular, e a imagem do hero vai para baixo do texto.

## Marca

Os arquivos originais ficam em `assets-src/` e `npm run images` gera:

| Arquivo | Uso |
|---|---|
| `images/brand/logo-horizontal.*` | logo colorido para fundos claros (header) |
| `images/brand/logo-dark.*` | símbolo colorido + texto branco para fundos escuros (footer) |
| `images/brand/logo-white.*` | versão monocromática branca |
| `images/brand/logo-symbol.*` | apenas o símbolo "LC" |
| `favicon-*.png`, `apple-touch-icon.png`, `icons/icon-*.png` | favicons e PWA |

Quando houver o logo vetorial (SVG), basta substituir os arquivos mantendo os nomes.

---

## Antes de publicar

- [ ] Trocar telefone, WhatsApp, e-mail e redes em `src/data/mock/company.mock.js` (ou na tabela `company_settings`)
- [ ] **Substituir os depoimentos ilustrativos** (`testimonials.mock.js`) por depoimentos reais e autorizados
- [ ] Trocar as ilustrações SVG do portfólio (`public/images/portfolio/`) por screenshots reais
- [ ] Revisar os textos legais com um profissional (política de privacidade, termos e cookies)
- [ ] Definir `NODE_ENV=production`, `APP_URL`, `COOKIE_SECRET` e `TRUST_PROXY=true` (se houver proxy reverso)
- [ ] Configurar SMTP (`MAIL_DRIVER=smtp`) e o destinatário dos leads
- [ ] Rodar `npm run build`

## Painel administrativo (próxima etapa)

A arquitetura já está preparada para o `/admin`:

- **Dados:** todas as tabelas (`services`, `plans`, `plan_features`, `portfolio_projects`, `testimonials`, `faq`, `leads`, `company_settings`, `site_sections`) existem com os campos `active` e `display_order` para publicar e ordenar.
- **Leitura/escrita:** acrescente métodos `create/update/delete` aos repositórios MySQL e crie services de administração. As views públicas não mudam.
- **Cache:** ao salvar configurações ou seções, chame `forget('company')` ou `forget('sections')` (`src/utils/cache.js`).
- **Leads:** `repositories.leads.findAll()` já existe, e o status segue o fluxo `new → contacted → proposal → won/lost`.
- **Uploads públicos:** use `public/uploads/` para as imagens do portfólio enviadas pelo painel.
- O `robots.txt` já bloqueia `/admin`.
