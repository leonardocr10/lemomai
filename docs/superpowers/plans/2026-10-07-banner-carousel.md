# Carrossel de banners — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Carrossel de banners no topo da home, gerenciado em `/admin/banners`, com os 4 banners enviados já cadastrados.

**Architecture:** Nova tabela `banners` no SQLite exposta pelo mesmo `table()` genérico do repositório; recurso novo no `resourceController` com upload via multer; partial `banner-carousel.ejs` + módulo `public/js/modules/banner-carousel.js`.

**Tech Stack:** Node 24, Express 5, EJS, multer, zod, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-07-banner-carousel-design.md`

## Global Constraints

- Sem dependências novas; sem script/style inline (CSP).
- Upload: `.jpg .jpeg .png .webp`, MIME `image/jpeg|png|webp`, máx. 5 MB, assinatura conferida.
- Todo POST de banner passa por `verifyCsrf` depois do multer.
- Celular = `max-width: 767px`.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/db/schema.js` (mod) | tabela `banners` + `TABLES.banners` |
| `src/db/seed.js` (mod) | seed dos 4 banners |
| `src/data/mock/banners.mock.js` | os 4 banners (seed e driver mock) |
| `src/repositories/{sqlite,mock,mysql}/index.js` (mod) | `banners` |
| `src/services/content.service.js` (mod) | `listBanners()`, `getHomeContent().banners` |
| `src/middlewares/banner-upload.js` | multer + verificação de assinatura + remoção de arquivos |
| `src/validators/admin.validator.js` (mod) | schema `banner` |
| `src/controllers/admin/resource.controller.js` (mod) | ganchos `beforeSave`/`afterRemove`, `multipart` |
| `src/controllers/admin/resources.js` (mod) | recurso `banners` |
| `src/routes/admin.routes.js` (mod) | rotas de banner antes do CSRF global |
| `views/admin/partials/field.ejs` (mod) | tipo `file` com prévia e "remover" |
| `views/admin/resources/{list,form}.ejs` (mod) | coluna de miniatura, `enctype` |
| `views/partials/sections/banner-carousel.ejs` | marcação do carrossel |
| `views/partials/sections/hero.ejs`, `views/pages/home.ejs` (mod) | troca hero ↔ carrossel |
| `public/js/modules/banner-carousel.js`, `public/js/main.js` (mod) | comportamento |
| `public/css/sections.css` (mod) | estilos do carrossel |
| `tests/admin-http.test.js`, `tests/admin-db.test.js` (mod) | testes |

---

### Task 1: Dados (tabela, seed, mock, repositórios, service)

**Interfaces — Produces:** `repositories.banners.findAll()` (ativos, ordenados), `findAllAdmin/findById/create/update/remove` no sqlite; `contentService.listBanners()`; `getHomeContent()` retorna `banners`.

- [ ] Teste em `tests/admin-db.test.js`: banco novo tem 4 banners ativos com `image` começando por `/images/banners/` e `alt` não vazio.
- [ ] `schema.js`: `CREATE TABLE IF NOT EXISTS banners (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, alt TEXT NOT NULL, href TEXT, image TEXT NOT NULL, mobile_image TEXT, active INTEGER NOT NULL DEFAULT 1, display_order INTEGER NOT NULL DEFAULT 0, created_at …, updated_at …)` e `TABLES.banners = { table: 'banners', columns: ['title','alt','href','image','mobileImage','active','displayOrder'], bool: ['active'] }`.
- [ ] `banners.mock.js` com os 4 banners (alt = título + subtítulo do banner).
- [ ] `seed.js`: `seedCollection(db, TABLES.banners, require('../data/mock/banners.mock'))`.
- [ ] Repositórios: sqlite `banners: table(TABLES.banners)`; mock `banners: collection(bannersData)`; mysql `banners: { findAll: async () => [] }`.
- [ ] `content.service.js`: `listBanners: () => repositories.banners.findAll()` e incluir em `getHomeContent`.
- [ ] `npm test` → PASS. Commit.

### Task 2: Carrossel na home

- [ ] Testes (`tests/http.test.js`, driver mock): home contém `data-banner-carousel`, `href="/orcamento"` em um slide e um `h1` com classe `visually-hidden`.
- [ ] `banner-carousel.ejs`: `<section class="banner-carousel" aria-roledescription="carrossel" aria-label="Destaques">`, trilho `ul` com `li` por slide (`aria-roledescription="slide"`, `aria-label="N de M"`), cada slide `<a href>` com `<picture>` (`<source media="(max-width: 767px)" srcset=mobileImage>` quando houver) e `<img alt width=2000 height=667>`; primeira imagem `fetchpriority="high"`, demais `loading="lazy"`. Slides sem `mobileImage` recebem `banner-slide--desktop-only`. Controles: botões anterior/próximo, pausar/continuar, bolinhas.
- [ ] `home.ejs`: se `banners.length`, renderiza o carrossel e passa `heroMode` para o hero: `'hidden'` (todos têm mobile), `'mobile-only'` (algum sem mobile — o hero aparece só no celular quando nenhum slide tem mobile) ou mostra normal. Regra: `const mobileSlides = banners.filter(b => b.mobileImage)`; carrossel ganha `banner-carousel--desktop-only` se `mobileSlides.length === 0`; hero ganha `hero--mobile-only` nesse caso, ou fica oculto (só `h1` oculto) se houver slides mobile.
- [ ] `head.ejs`: com banners, preload da primeira imagem do banner em vez do hero.
- [ ] `banner-carousel.js`: scroll-snap no trilho; setas e bolinhas fazem `scrollTo`; slide ativo por `IntersectionObserver`/scroll; autoplay 6 s (só slides visíveis), pausa em `mouseenter`/`focusin`, botão pausar alterna `aria-pressed`; sem autoplay com `prefers-reduced-motion`.
- [ ] CSS em `sections.css`.
- [ ] `npm test` → PASS. Commit.

### Task 3: Admin — upload e CRUD

- [ ] Testes (`tests/admin-http.test.js`): lista `/admin/banners` mostra os 4; criar banner com PNG real (multipart, `FormData`) → 302 e aparece na home; upload `.png` com conteúdo de texto → 422 com mensagem; POST multipart sem `_csrf` → 403; desativar banner some da home.
- [ ] `banner-upload.js`: multer `diskStorage` em `public/uploads/banners`, nomes aleatórios, `fields([{name:'image'},{name:'mobileImage'}])`, limite 5 MB; após upload, confere assinatura (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`) e apaga + marca `req.uploadErrors[campo]` se inválido; `discardUploads(req)`, `removePublicFile(urlPath)` (só dentro de `/uploads/banners/`).
- [ ] Schema `banner`: `title` (1–120), `alt` (5–300), `href` (link), `active`, `displayOrder`, `removeMobileImage` (checkbox).
- [ ] `resource.controller.js`: opção `def.prepare(req, item, data) -> { data, errors }` chamada após validar; `def.afterRemove(item)`; em erro de validação chama `def.discard?.(req)`.
- [ ] Recurso `banners`: colunas (miniatura, nome, link), campos (`title`, `alt` textarea, `href`, `image` file, `mobileImage` file com remover, ordem, ativo); `prepare` aplica arquivos enviados, exige `image` na criação, apaga arquivos substituídos; `afterRemove` apaga arquivos de upload.
- [ ] Rotas: banner antes de `router.use(urlencoded, verifyCsrf)`, POSTs com `[bannerUpload, verifyCsrf]` (excluir com `[urlencoded, verifyCsrf]`).
- [ ] Menu: item "Banners".
- [ ] `npm test` → PASS. Commit.

### Task 4: Verificação e docs

- [ ] README: seção do painel cita Banners e tamanho recomendado (2000×667 desktop; mobile 1080×1350 ou 1080×1080).
- [ ] Navegador: home desktop (carrossel, autoplay, setas), celular (hero de texto), `/admin/banners` (miniaturas, edição).
- [ ] Commit.
