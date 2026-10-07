# Painel administrativo Lenom.AI — design

Data: 2026-10-06 · Status: aprovado

## Objetivo

Permitir que o dono do site gerencie, sem editar código, o conteúdo comercial da
landing page: planos e preços, FAQ, depoimentos, dados da empresa e os leads
recebidos pelos formulários. Banco interno simples, sem servidor externo.

## Decisões

| Tema | Decisão |
|---|---|
| Banco | SQLite em `storage/lenom.db` via `node:sqlite` nativo (Node ≥ 22.13; projeto roda em 24). Sem dependência nova. |
| Fonte de dados do site | Novo driver de repositório `sqlite`, padrão. `DATA_DRIVER=sqlite\|mock\|mysql`; `USE_MOCK_DATA=true` continua aceito e equivale a `mock`. |
| Usuários | Um admin. Criado na primeira execução a partir de `ADMIN_USER` / `ADMIN_PASSWORD` do `.env`. Senha trocável no painel. |
| Escopo | Planos, FAQ, depoimentos, dados da empresa, leads, troca de senha. |
| Fora do escopo | Upload de imagens, serviços, portfólio, seções, múltiplos usuários. |
| Login | Tela própria com o banner animado "Lenom.AI" sendo digitado (ver abaixo). |

## Dados

Tabelas SQLite:

- `plans` — colunas espelhando `plans.mock.js`; `features` em JSON (TEXT).
- `faq` — question, answer, active, display_order.
- `testimonials` — author, role, company, content, rating, avatar, active, display_order.
- `company_settings` — linha única (id = 1), campos de `company.mock.js`.
- `leads` — mesmos campos gravados hoje em `storage/leads.json`, mais `status`
  (`new`, `contacted`, `closed`, `discarded`).
- `admin_user` — username, password_hash (scrypt + salt), updated_at.
- `admin_sessions` — id (token aleatório 32 bytes), expires_at.

Na primeira abertura o banco é criado e populado com o conteúdo de
`src/data/mock` (planos, FAQ, depoimentos, empresa) e com `storage/leads.json`,
se existir. Serviços, portfólio e seções continuam vindo dos mocks pelo driver
`sqlite` (somente leitura).

O repositório `sqlite` expõe a mesma interface de leitura dos drivers atuais e
acrescenta métodos de escrita (`create`, `update`, `remove`, `findById`,
`findAllAdmin` incluindo inativos). O código público continua usando só
`services/*`.

## Autenticação

- `scrypt` (node:crypto) com salt por usuário; comparação com `timingSafeEqual`.
- Sessão: cookie `lenom_admin` assinado, `httpOnly`, `sameSite=lax`, `secure` em
  produção, validade 8 h; token guardado em `admin_sessions`.
- Rate limit no POST de login (reaproveita `express-rate-limit`).
- Todo POST do admin passa por `verifyCsrf`.
- Rotas `/admin/*` exigem sessão; sem sessão → redirect para `/admin/login`.
- `/admin` com `noindex` e bloqueado no `robots.txt`; fora do sitemap.
- Em produção, ausência de `ADMIN_PASSWORD` sem admin já criado = painel desativado
  com aviso no log (nunca senha padrão em produção). Em desenvolvimento, padrão
  `admin` / `admin` com aviso no log.

## Telas (`/admin`)

Layout próprio (`views/admin/layout.ejs`), menu lateral, cores da marca, CSS e
JS em arquivos externos (CSP sem inline).

- **Login** — card com o banner animado no topo, campos usuário/senha.
- **Planos** — lista (nome, categoria, preço, ativo, ordem); formulário com
  todos os campos; itens inclusos em textarea, um por linha.
- **FAQ** e **Depoimentos** — lista + formulário + excluir (com confirmação).
- **Empresa** — formulário único.
- **Leads** — lista paginada com filtro por status; detalhe; troca de status.
- **Senha** — senha atual + nova (mín. 8 caracteres) + confirmação.

Validação com `zod`; erros exibidos por campo. Ao salvar: limpa o cache
(`utils/cache.forget()`) e mostra toast de sucesso.

## Banner animado "Lenom.AI"

Entregue de duas formas:

1. `assets-src/banner-lenom.html` — arquivo único (fora de `public/`, porque a CSP do site bloquearia o JavaScript embutido), CSS e JS embutidos, símbolo
   embutido como SVG inline, conforme a especificação do pedido (3:1, máx.
   1200px, cqw, petróleo #0f2d4a sobre #0b1d33, "Lenom" Lexend 700 branco,
   ".AI" Courier Prime 700 verde #6fd35a, ciclo digita/pausa/apaga, cópia
   invisível reservando espaço, botão "Digitar de novo", `prefers-reduced-motion`,
   `aria-label="Lenom.AI"`).
2. Componente reaproveitado na tela de login (`views/admin/partials/typing-banner.ejs`
   + `public/css/admin.css` + `public/js/admin/typing-banner.js`), mesmo
   comportamento, sem o botão "Digitar de novo".

Símbolo: versão `simbolo-branco.svg` (a versão colorida tem a barra petróleo,
invisível sobre o fundo petróleo).

## Testes

- Unit: repositório sqlite (seed, CRUD, inativos ocultos no público), hash/verify
  de senha, validação dos formulários.
- HTTP: `/admin` sem sessão → 302 login; login inválido → 401 com mensagem;
  login válido → painel; editar preço de plano → home mostra novo preço; POST sem
  CSRF → 403.
- Testes usam banco temporário (`DATA_FILE` apontando para pasta temporária).
