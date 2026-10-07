# Painel com Tabler — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Todo o `/admin` em Tabler, com grid (busca/ordenação/paginação/massa), formulários novos e upload com drop/prévia/proporção/recorte.

**Architecture:** Vendor estático de `node_modules`; util `admin-grid` para estado da URL e paginação; `findPage` nos repositórios sqlite; views do admin reescritas com partials Tabler; `public/js/admin.js` para modal de confirmação, seleção em massa, autosubmit e dropzone/cropper.

**Spec:** `docs/superpowers/specs/2026-10-07-admin-tabler-redesign.md`

## Global Constraints

- Sem script/style inline no HTML; `img-src` com `blob:`.
- Ordenação só por colunas declaradas; `per` ∈ {10, 25, 50}.
- Todo POST do admin com CSRF; ações em massa só com ids numéricos.
- Testes: `npm test`.

### Task 1: Infra — vendor, CSP, grid util, `findPage`, busca de leads
- Teste unit `parseGrid` (padrões, sort inválido ignorado, per inválido → 25, page ≥ 1) e `pageItems` (reticências).
- Teste db: `plans.findPage({ q: 'landing' })` acha 1; ordenação por `price desc`; `leads.findAll({ q })` filtra por nome/e-mail.
- `src/utils/admin-grid.js`: `parseGrid(query, { sortable, defaultSort, defaultDir })`, `gridUrl(base, state, overrides)`, `pageItems(page, pages)`.
- `table().findPage({ q, searchColumns, sort, dir, limit, offset })` → `{ items, total }` (LIKE com ESCAPE).
- `leads.findAll/count` aceitam `q`, `sort`, `dir`.
- `app.js`: `/vendor/tabler`, `/vendor/tabler-icons`, `/vendor/cropper`. CSP `img-src blob:`.
- Commit.

### Task 2: Layout Tabler, login e painel inicial
- Testes HTTP: layout carrega `/vendor/tabler/css/tabler.min.css`; login sem `main.css`; dashboard com cards.
- `layout.ejs` (navbar-vertical escura, page-header, flash), `nav.ejs` com ícones, `login.ejs`, `dashboard.ejs`, `admin.css` (tema, banner do login, dropzone).
- Commit.

### Task 3: Grid e formulários dos cadastros
- Testes HTTP: busca filtra; `sort=title&dir=desc` ordena; `per=10&page=2`; massa desativar/ativar/excluir; massa sem CSRF → 403; ids não numéricos ignorados.
- Partials `grid/toolbar`, `grid/th`, `grid/pagination`, `confirm-modal`; `resources/list.ejs` e `form.ejs` com seções; `field.ejs` Tabler (switch, prefixo, dropzone).
- `resource.controller`: `list` com `findPage`, `bulk(req)`; rota `POST /:res/lote`.
- Commit.

### Task 4: Dropzone + recorte
- `field.ejs` tipo `file` → dropzone com prévia, dimensões, aviso de proporção (`data-ratio`), botões trocar/remover/recortar; `cropper-modal.ejs`; JS com Cropper (WebP, DataTransfer).
- Teste HTTP: formulário de banner carrega cropper e dropzone.
- Commit.

### Task 5: Leads, empresa e senha
- Leads: abas de status, busca, ordenação, paginação, massa "mudar status"; detalhe em card.
- Empresa e senha em cards Tabler.
- Testes: massa de status, busca de leads.
- Commit.

### Task 6: Verificação e docs
- Navegador: login, dashboard, listas, formulário de banner (drop/recorte), celular.
- README.
- Commit.
