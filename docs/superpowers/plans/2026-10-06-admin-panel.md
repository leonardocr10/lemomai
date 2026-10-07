# Painel administrativo Lenom.AI — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login + painel `/admin` para gerenciar planos, FAQ, depoimentos, dados da empresa e leads, gravando num SQLite interno; banner animado "Lenom.AI" na tela de login e como arquivo HTML avulso.

**Architecture:** Novo driver de repositório `sqlite` (padrão) ao lado de `mock` e `mysql`, com a mesma interface de leitura usada pelos services públicos e métodos extras de escrita. Autenticação de um único admin com senha scrypt e sessão em cookie assinado guardada no banco. Telas server-rendered em EJS, reaproveitando `main.css` (botões, campos, alertas) mais `admin.css` para o layout.

**Tech Stack:** Node 24 (`node:sqlite`, `node:crypto`), Express 5, EJS, zod 4, express-rate-limit, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-06-admin-panel-design.md`

## Global Constraints

- Sem dependências novas no `package.json`.
- CSP atual sem `'unsafe-inline'`: nenhum `<script>` ou `style=""` inline nas views do admin.
- Todo POST do admin passa por `verifyCsrf` (campo `_csrf`).
- Textos de interface em português do Brasil.
- Cores da marca: petróleo `#0f2d4a`, verde `#5dbb46`, verde claro `#6fd157`, verde-água `#1fa6a0`.
- Banner animado: verde do texto ".AI"/cursor `#6fd35a`, fundo do banner `#0f2d4a`, fundo da página `#0b1d33`.
- Testes rodam com `npm test` (`node --test tests/*.test.js`); cada arquivo de teste roda em processo próprio.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/config/index.js` (mod) | `dataDriver`, `dataFile`, `admin.user/password` |
| `src/db/rows.js` | conversão camelCase ↔ snake_case, bool/JSON ↔ colunas |
| `src/db/schema.js` | SQL das tabelas e definições de colunas por tabela |
| `src/db/seed.js` | popula o banco vazio a partir de `src/data/mock` e `storage/leads.json` |
| `src/db/sqlite.js` | abre/cria o banco (`getDb`, `closeDb`) |
| `src/repositories/sqlite/index.js` | repositórios públicos + escrita + admin |
| `src/repositories/index.js` (mod) | escolhe driver por `config.dataDriver` |
| `src/services/auth.service.js` | hash de senha, admin inicial, sessões, troca de senha |
| `src/services/admin.service.js` | operações do painel (CRUD + cache) |
| `src/validators/admin.validator.js` | schemas zod dos formulários do painel |
| `src/middlewares/admin-auth.js` | cookie de sessão, `loadAdmin`, `requireAdmin` |
| `src/controllers/admin/*.js` | auth, recursos (planos/FAQ/depoimentos), empresa, leads, senha |
| `src/routes/admin.routes.js` | rotas `/admin` |
| `views/admin/**` | layout, login, listas e formulários |
| `public/css/admin.css`, `public/js/admin.js`, `public/js/typing-banner.js` | estilo e comportamento do painel e do banner |
| `assets-src/banner-lenom.html` | banner animado avulso (arquivo único) |
| `tests/admin-db.test.js`, `tests/admin-http.test.js` | testes |

Nota: o banner avulso fica em `assets-src/` (não servido), porque arquivos em `public/` recebem a CSP do site, que bloqueia o JavaScript embutido.

---

### Task 1: Configuração + banco SQLite com seed

**Files:**
- Modify: `src/config/index.js`
- Create: `src/db/rows.js`, `src/db/schema.js`, `src/db/seed.js`, `src/db/sqlite.js`
- Test: `tests/admin-db.test.js`

**Interfaces:**
- Produces: `config.dataDriver: 'sqlite'|'mock'|'mysql'`, `config.dataFile: string`, `config.admin: { user, password }`; `getDb(): DatabaseSync`, `closeDb(): void`; `TABLES.{plans,faq,testimonials}: { table, columns, bool, json }`; `encodeRow(def, data) -> [[column, value]]`, `decodeRow(def, row) -> object`.

- [ ] **Step 1: Teste do seed**

`tests/admin-db.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATA_DRIVER = 'sqlite';
process.env.DATA_FILE = ':memory:';

const { getDb } = require('../src/db/sqlite');

test('banco novo é populado com os dados de exemplo', () => {
  const db = getDb();
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM plans').get().n >= 6);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM faq').get().n > 0);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM testimonials').get().n > 0);
  const company = JSON.parse(db.prepare('SELECT data FROM company_settings WHERE id = 1').get().data);
  assert.equal(company.companyName, 'Lenom.AI');
  assert.equal(getDb(), db, 'getDb reutiliza a conexão');
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/admin-db.test.js` → FAIL `Cannot find module '../src/db/sqlite'`.

- [ ] **Step 3: Config**

Em `src/config/index.js`, adicionar `const path = require('node:path');` no topo, a função abaixo antes de `const config` e trocar a linha `useMockData` pelas novas chaves:

```js
const DRIVERS = ['sqlite', 'mock', 'mysql'];
/** DATA_DRIVER tem prioridade; USE_MOCK_DATA continua aceito por compatibilidade. */
function dataDriver() {
  const driver = String(process.env.DATA_DRIVER || '').toLowerCase();
  if (DRIVERS.includes(driver)) return driver;
  if (process.env.USE_MOCK_DATA === 'true') return 'mock';
  if (process.env.USE_MOCK_DATA === 'false') return 'mysql';
  return 'sqlite';
}
```

```js
  dataDriver: dataDriver(),
  dataFile: process.env.DATA_FILE || path.resolve(__dirname, '../../storage/lenom.db'),
  admin: {
    user: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
  },
```

- [ ] **Step 4: `src/db/rows.js`**

```js
/**
 * Conversão entre objetos da aplicação (camelCase) e linhas SQLite
 * (snake_case, booleanos como 0/1, listas como JSON).
 */
const toSnake = (key) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
const toCamel = (key) => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

/** Só colunas declaradas em def.columns entram no SQL — nomes nunca vêm do usuário. */
function encodeRow(def, data) {
  return def.columns
    .filter((key) => data[key] !== undefined)
    .map((key) => {
      let value = data[key];
      if (def.json?.includes(key)) value = JSON.stringify(value ?? []);
      else if (def.bool?.includes(key)) value = value ? 1 : 0;
      return [toSnake(key), value ?? null];
    });
}

function decodeRow(def, row) {
  if (!row) return null;
  const item = {};
  for (const [column, value] of Object.entries(row)) {
    const key = toCamel(column);
    if (def.json?.includes(key)) item[key] = JSON.parse(value || '[]');
    else if (def.bool?.includes(key)) item[key] = Boolean(value);
    else item[key] = value;
  }
  return item;
}

module.exports = { toSnake, toCamel, encodeRow, decodeRow };
```

- [ ] **Step 5: `src/db/schema.js`**

```js
/**
 * Estrutura do banco interno (SQLite). CREATE IF NOT EXISTS: seguro rodar a cada início.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'project',
  icon TEXT,
  price REAL,
  billing_type TEXT NOT NULL DEFAULT 'one-time',
  price_prefix TEXT,
  highlighted INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  description TEXT,
  cta_text TEXT,
  cta_href TEXT,
  features TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS faq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT NOT NULL,
  role TEXT,
  company TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  avatar TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  name TEXT,
  email TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS leads_status ON leads (status);
CREATE TABLE IF NOT EXISTS admin_user (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
`;

const TABLES = {
  plans: {
    table: 'plans',
    columns: ['name', 'slug', 'category', 'icon', 'price', 'billingType', 'pricePrefix', 'highlighted', 'badge',
      'description', 'ctaText', 'ctaHref', 'features', 'active', 'displayOrder'],
    bool: ['highlighted', 'active'],
    json: ['features'],
  },
  faq: {
    table: 'faq',
    columns: ['question', 'answer', 'active', 'displayOrder'],
    bool: ['active'],
  },
  testimonials: {
    table: 'testimonials',
    columns: ['author', 'role', 'company', 'content', 'rating', 'avatar', 'active', 'displayOrder'],
    bool: ['active'],
  },
};

module.exports = { SCHEMA, TABLES };
```

- [ ] **Step 6: `src/db/seed.js`**

```js
/**
 * Popula um banco recém-criado com o conteúdo atual de src/data/mock e
 * importa uma única vez os leads gravados em storage/leads.json (modo mock).
 */
const fs = require('node:fs');
const path = require('node:path');
const { TABLES } = require('./schema');
const { encodeRow } = require('./rows');

const LEADS_FILE = path.resolve(__dirname, '../../storage/leads.json');

function insert(db, def, data) {
  const pairs = encodeRow(def, data);
  db.prepare(`INSERT INTO ${def.table} (${pairs.map(([c]) => c).join(', ')}) VALUES (${pairs.map(() => '?').join(', ')})`)
    .run(...pairs.map(([, v]) => v));
}

const isEmpty = (db, table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n === 0;

function seedCollection(db, def, items) {
  if (!isEmpty(db, def.table)) return;
  for (const item of items) insert(db, def, item);
}

function importLeads(db) {
  if (!isEmpty(db, 'leads') || !fs.existsSync(LEADS_FILE)) return;
  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  const stmt = db.prepare('INSERT INTO leads (source, status, name, email, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const { id, ...lead } of leads) {
    const now = new Date().toISOString();
    stmt.run(lead.source || 'contact', lead.status || 'new', lead.name || null, lead.email || null,
      JSON.stringify(lead), lead.createdAt || now, lead.updatedAt || lead.createdAt || now);
  }
}

function seed(db, { withLeads = true } = {}) {
  db.exec('BEGIN');
  try {
    seedCollection(db, TABLES.plans, require('../data/mock/plans.mock'));
    seedCollection(db, TABLES.faq, require('../data/mock/faq.mock'));
    seedCollection(db, TABLES.testimonials, require('../data/mock/testimonials.mock'));
    if (isEmpty(db, 'company_settings')) {
      const { id, ...company } = require('../data/mock/company.mock');
      db.prepare('INSERT INTO company_settings (id, data) VALUES (1, ?)').run(JSON.stringify(company));
    }
    if (withLeads) importLeads(db);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { seed };
```

- [ ] **Step 7: `src/db/sqlite.js`**

```js
/**
 * Banco interno (SQLite nativo do Node). Um arquivo em storage/lenom.db,
 * criado e populado automaticamente na primeira abertura.
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const { SCHEMA } = require('./schema');
const { seed } = require('./seed');

// node:sqlite ainda emite ExperimentalWarning ao carregar; silencia só esse aviso.
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) =>
  (String(warning).includes('SQLite') ? undefined : emitWarning.call(process, warning, ...args));
const { DatabaseSync } = require('node:sqlite');
process.emitWarning = emitWarning;

let db = null;

function getDb() {
  if (db) return db;
  const inMemory = config.dataFile === ':memory:';
  if (!inMemory) fs.mkdirSync(path.dirname(config.dataFile), { recursive: true });
  db = new DatabaseSync(config.dataFile);
  if (!inMemory) db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  seed(db, { withLeads: !inMemory });
  return db;
}

function closeDb() {
  if (db) db.close();
  db = null;
}

module.exports = { getDb, closeDb };
```

- [ ] **Step 8: Rodar** — `node --test tests/admin-db.test.js` → PASS.

- [ ] **Step 9: `.gitignore`** — adicionar `storage/lenom.db*`.

- [ ] **Step 10: Commit** — `git add -A && git commit -m "feat(admin): banco SQLite interno com seed"`.

---

### Task 2: Repositório `sqlite` e seleção de driver

**Files:**
- Create: `src/repositories/sqlite/index.js`
- Modify: `src/repositories/index.js`
- Test: `tests/admin-db.test.js` (acrescentar)

**Interfaces:**
- Consumes: `getDb`, `TABLES`, `encodeRow`, `decodeRow` (Task 1).
- Produces (repositório `sqlite`, além da interface pública existente):
  - `plans|faq|testimonials`: `findAll(filters)`, `findBySlug(slug)` (só plans), `findAllAdmin()`, `findById(id)`, `create(data)`, `update(id, data)`, `remove(id) -> boolean`
  - `company`: `get()`, `update(data)`
  - `leads`: `create(lead)`, `findAll({ status, limit, offset })`, `count({ status })`, `findById(id)`, `updateStatus(id, status)`
  - `admin`: `getUser() -> { username, passwordHash } | null`, `setUser(username, passwordHash)`, `createSession(id, expiresAt)`, `findSession(id) -> { id, expiresAt } | null`, `deleteSession(id)`, `deleteOtherSessions(keepId)`
  - `module.exports.driver` continua `'sqlite'|'mock'|'mysql'`.

- [ ] **Step 1: Testes do repositório** — acrescentar em `tests/admin-db.test.js`:

```js
const repositories = require('../src/repositories');

test('driver sqlite selecionado por DATA_DRIVER', () => {
  assert.equal(repositories.driver, 'sqlite');
});

test('planos: público só vê ativos; admin vê todos; CRUD funciona', async () => {
  const created = await repositories.plans.create({
    name: 'Plano Teste', slug: 'plano-teste', category: 'project', price: 99.9, billingType: 'one-time',
    features: ['Um', 'Dois'], highlighted: false, active: false, displayOrder: 99,
  });
  assert.deepEqual(created.features, ['Um', 'Dois']);
  assert.equal(created.active, false);
  assert.equal(await repositories.plans.findBySlug('plano-teste'), null);
  assert.ok((await repositories.plans.findAllAdmin()).some((p) => p.id === created.id));

  const updated = await repositories.plans.update(created.id, { active: true, price: 120 });
  assert.equal(updated.price, 120);
  assert.equal((await repositories.plans.findBySlug('plano-teste')).name, 'Plano Teste');
  assert.ok((await repositories.plans.findAll({ category: 'project' })).some((p) => p.slug === 'plano-teste'));

  assert.equal(await repositories.plans.remove(created.id), true);
  assert.equal(await repositories.plans.findById(created.id), null);
});

test('empresa e leads', async () => {
  const company = await repositories.company.get();
  await repositories.company.update({ ...company, phone: '(11) 0000-0000' });
  assert.equal((await repositories.company.get()).phone, '(11) 0000-0000');

  const lead = await repositories.leads.create({ source: 'contact', name: 'Ana', email: 'ana@x.com', message: 'Oi', status: 'new' });
  assert.equal(lead.status, 'new');
  assert.equal(lead.message, 'Oi');
  await repositories.leads.updateStatus(lead.id, 'contacted');
  assert.equal((await repositories.leads.findById(lead.id)).status, 'contacted');
  assert.equal(await repositories.leads.count({ status: 'contacted' }), 1);
  assert.equal((await repositories.leads.findAll({ status: 'contacted' })).length, 1);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/admin-db.test.js` → FAIL (driver `mock`/método inexistente).

- [ ] **Step 3: `src/repositories/sqlite/index.js`**

```js
/**
 * Repositórios no banco interno SQLite. Mesma interface de leitura dos
 * drivers mock/MySQL + métodos de escrita usados pelo painel /admin.
 * Serviços, portfólio e seções continuam vindo dos arquivos de exemplo.
 */
const { getDb } = require('../../db/sqlite');
const { TABLES } = require('../../db/schema');
const { encodeRow, decodeRow, toSnake } = require('../../db/rows');
const mock = require('../mock');

const ORDER = 'ORDER BY display_order ASC, id ASC';

function table(def) {
  const decode = (row) => decodeRow(def, row);
  const findById = async (id) => decode(getDb().prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(Number(id)));
  return {
    async findAll(filters = {}) {
      const where = ['active = 1'];
      const params = [];
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined) continue;
        if (!def.columns.includes(key)) throw new Error(`Filtro inválido: ${key}`);
        where.push(`${toSnake(key)} = ?`);
        params.push(value);
      }
      return getDb().prepare(`SELECT * FROM ${def.table} WHERE ${where.join(' AND ')} ${ORDER}`).all(...params).map(decode);
    },
    async findBySlug(slug) {
      return decode(getDb().prepare(`SELECT * FROM ${def.table} WHERE slug = ? AND active = 1`).get(String(slug)));
    },
    async findAllAdmin() {
      return getDb().prepare(`SELECT * FROM ${def.table} ${ORDER}`).all().map(decode);
    },
    findById,
    async create(data) {
      const pairs = encodeRow(def, data);
      const result = getDb()
        .prepare(`INSERT INTO ${def.table} (${pairs.map(([c]) => c).join(', ')}) VALUES (${pairs.map(() => '?').join(', ')})`)
        .run(...pairs.map(([, v]) => v));
      return findById(result.lastInsertRowid);
    },
    async update(id, data) {
      const pairs = encodeRow(def, data);
      if (pairs.length) {
        getDb()
          .prepare(`UPDATE ${def.table} SET ${pairs.map(([c]) => `${c} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(...pairs.map(([, v]) => v), Number(id));
      }
      return findById(id);
    },
    async remove(id) {
      return getDb().prepare(`DELETE FROM ${def.table} WHERE id = ?`).run(Number(id)).changes > 0;
    },
  };
}

const company = {
  async get() {
    const row = getDb().prepare('SELECT data FROM company_settings WHERE id = 1').get();
    return { id: 1, ...JSON.parse(row.data) };
  },
  async update(data) {
    const { id, ...rest } = data;
    getDb().prepare('UPDATE company_settings SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(JSON.stringify(rest));
    return company.get();
  },
};

const decodeLead = (row) =>
  row ? { ...JSON.parse(row.data), id: row.id, source: row.source, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at } : null;

const leadFilter = (status) => (status ? { sql: 'WHERE status = ?', params: [status] } : { sql: '', params: [] });

const leads = {
  async create(lead) {
    const { status = 'new', ...data } = lead;
    const now = new Date().toISOString();
    const result = getDb()
      .prepare('INSERT INTO leads (source, status, name, email, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(data.source, status, data.name || null, data.email || null, JSON.stringify(data), now, now);
    return leads.findById(result.lastInsertRowid);
  },
  async findAll({ status, limit = 1000, offset = 0 } = {}) {
    const { sql, params } = leadFilter(status);
    return getDb()
      .prepare(`SELECT * FROM leads ${sql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map(decodeLead);
  },
  async count({ status } = {}) {
    const { sql, params } = leadFilter(status);
    return getDb().prepare(`SELECT COUNT(*) AS n FROM leads ${sql}`).get(...params).n;
  },
  async findById(id) {
    return decodeLead(getDb().prepare('SELECT * FROM leads WHERE id = ?').get(Number(id)));
  },
  async updateStatus(id, status) {
    getDb().prepare('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), Number(id));
    return leads.findById(id);
  },
};

const admin = {
  async getUser() {
    const row = getDb().prepare('SELECT username, password_hash FROM admin_user WHERE id = 1').get();
    return row ? { username: row.username, passwordHash: row.password_hash } : null;
  },
  async setUser(username, passwordHash) {
    getDb()
      .prepare(`INSERT INTO admin_user (id, username, password_hash) VALUES (1, ?, ?)
        ON CONFLICT (id) DO UPDATE SET username = excluded.username, password_hash = excluded.password_hash, updated_at = CURRENT_TIMESTAMP`)
      .run(username, passwordHash);
  },
  async createSession(id, expiresAt) {
    const db = getDb();
    db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(Date.now());
    db.prepare('INSERT INTO admin_sessions (id, expires_at) VALUES (?, ?)').run(id, expiresAt);
  },
  async findSession(id) {
    const row = getDb().prepare('SELECT id, expires_at FROM admin_sessions WHERE id = ?').get(String(id));
    return row ? { id: row.id, expiresAt: row.expires_at } : null;
  },
  async deleteSession(id) {
    getDb().prepare('DELETE FROM admin_sessions WHERE id = ?').run(String(id));
  },
  async deleteOtherSessions(keepId) {
    getDb().prepare('DELETE FROM admin_sessions WHERE id <> ?').run(String(keepId));
  },
};

module.exports = {
  services: mock.services,
  portfolio: mock.portfolio,
  sections: mock.sections,
  plans: table(TABLES.plans),
  faq: table(TABLES.faq),
  testimonials: table(TABLES.testimonials),
  company,
  leads,
  admin,
};
```

- [ ] **Step 4: `src/repositories/index.js`**

```js
/**
 * Ponto único de escolha da fonte de dados (config.dataDriver):
 *
 *   sqlite -> repositories/sqlite  (banco interno storage/lenom.db, padrão; habilita o /admin)
 *   mock   -> repositories/mock    (somente leitura, sem banco)
 *   mysql  -> repositories/mysql   (Sequelize + MySQL)
 *
 * Services importam SEMPRE deste arquivo; nenhuma outra parte do código
 * precisa saber de onde os dados vêm.
 */
const config = require('../config');

const driver = config.dataDriver;

module.exports = require(`./${driver}`);
module.exports.driver = driver;
```

- [ ] **Step 5: Rodar** — `npm test` → todos PASS (testes antigos usam `USE_MOCK_DATA=true` → mock).

- [ ] **Step 6: Commit** — `git commit -am "feat(admin): repositório sqlite com escrita"` (incluir o arquivo novo com `git add`).

---

### Task 3: Autenticação (serviço, middleware, login/logout, layout e banner do login)

**Files:**
- Create: `src/services/auth.service.js`, `src/middlewares/admin-auth.js`, `src/validators/admin.validator.js`, `src/controllers/admin/auth.controller.js`, `src/routes/admin.routes.js`, `views/admin/layout.ejs`, `views/admin/login.ejs`, `views/admin/partials/typing-banner.ejs`, `views/admin/partials/nav.ejs`, `views/admin/dashboard.ejs`, `public/css/admin.css`, `public/js/admin.js`, `public/js/typing-banner.js`
- Modify: `src/app.js`, `src/middlewares/security.js`, `scripts/build-assets.js`
- Test: `tests/admin-http.test.js`

**Interfaces:**
- Consumes: `repositories.admin.*` (Task 2).
- Produces:
  - `auth.hashPassword(pw) -> Promise<string>`, `auth.verifyPassword(pw, stored) -> Promise<boolean>`, `auth.ensureAdminUser() -> Promise<boolean>`, `auth.login(username, pw) -> Promise<{id, expiresAt}|null>`, `auth.getSession(id) -> Promise<{id, expiresAt}|null>`, `auth.logout(id)`, `auth.changePassword(sessionId, current, next) -> Promise<boolean>`
  - `adminAuth.loadAdmin`, `adminAuth.requireAdmin`, `adminAuth.setSessionCookie(res, session)`, `adminAuth.clearSessionCookie(res)`, `adminAuth.COOKIE`
  - `res.renderAdmin(view, locals)` → `views/admin/<view>.ejs` dentro de `views/admin/layout.ejs`
  - `validateAdmin(schemaName, input) -> { success, data } | { success: false, errors }`
  - `loginLimiter` em `middlewares/security.js`
  - Helper de teste `tests/helpers/admin-client.js` com `createClient(base)` → `{ get(path), post(path, fields), login(user, pw), csrf }`

- [ ] **Step 1: Helper de cliente HTTP com cookies** — `tests/helpers/admin-client.js`:

```js
/** Cliente HTTP mínimo que guarda cookies e lê o token CSRF das páginas. */
function createClient(base) {
  const jar = new Map();
  let csrf = '';

  const store = (response) => {
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (/expires=Thu, 01 Jan 1970/i.test(header) || value === '') jar.delete(name);
      else jar.set(name, value);
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

  async function get(path) {
    const response = await fetch(base + path, { headers: { cookie: cookie() }, redirect: 'manual' });
    store(response);
    const body = await response.text();
    const match = body.match(/name="_csrf" value="([^"]+)"/);
    if (match) csrf = match[1];
    return { status: response.status, location: response.headers.get('location'), body };
  }

  async function post(path, fields = {}, { withCsrf = true } = {}) {
    const form = new URLSearchParams({ ...(withCsrf ? { _csrf: csrf } : {}), ...fields });
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { cookie: cookie(), 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
      redirect: 'manual',
    });
    store(response);
    return { status: response.status, location: response.headers.get('location'), body: await response.text() };
  }

  async function login(username, password) {
    await get('/admin/login');
    return post('/admin/login', { username, password });
  }

  return { get, post, login, cookies: jar };
}

module.exports = { createClient };
```

- [ ] **Step 2: Testes HTTP de login** — `tests/admin-http.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DATA_DRIVER = 'sqlite';
process.env.DATA_FILE = ':memory:';
process.env.ADMIN_USER = 'dono';
process.env.ADMIN_PASSWORD = 'senha-forte-123';

const createApp = require('../src/app');
const { createClient } = require('./helpers/admin-client');

let server;
let base;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('/admin sem sessão redireciona para o login', async () => {
  const client = createClient(base);
  const response = await client.get('/admin');
  assert.equal(response.status, 302);
  assert.equal(response.location, '/admin/login');
});

test('tela de login tem banner animado, noindex e CSRF', async () => {
  const client = createClient(base);
  const response = await client.get('/admin/login');
  assert.equal(response.status, 200);
  assert.match(response.body, /aria-label="Lenom\.AI"/);
  assert.match(response.body, /noindex/);
  assert.match(response.body, /name="_csrf"/);
});

test('login inválido é recusado', async () => {
  const client = createClient(base);
  const response = await client.login('dono', 'errada');
  assert.equal(response.status, 401);
  assert.match(response.body, /Usuário ou senha inválidos/);
});

test('login sem CSRF é bloqueado', async () => {
  const client = createClient(base);
  await client.get('/admin/login');
  const response = await client.post('/admin/login', { username: 'dono', password: 'senha-forte-123' }, { withCsrf: false });
  assert.equal(response.status, 403);
});

test('login válido abre o painel e logout encerra a sessão', async () => {
  const client = createClient(base);
  const response = await client.login('dono', 'senha-forte-123');
  assert.equal(response.status, 302);
  assert.equal(response.location, '/admin');
  const panel = await client.get('/admin');
  assert.equal(panel.status, 200);
  assert.match(panel.body, /Painel/);

  const logout = await client.post('/admin/logout');
  assert.equal(logout.status, 302);
  assert.equal((await client.get('/admin')).status, 302);
});
```

- [ ] **Step 3: Rodar e ver falhar** — `node --test tests/admin-http.test.js` → FAIL (`/admin` 404).

- [ ] **Step 4: `src/services/auth.service.js`**

```js
/**
 * Autenticação do painel: um único admin, senha com scrypt (node:crypto)
 * e sessões com token aleatório guardadas no banco interno.
 */
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const config = require('../config');
const repositories = require('../repositories');
const logger = require('../utils/logger');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SESSION_TTL = 8 * 60 * 60 * 1000;
// Hash descartável: mantém o tempo de resposta igual quando o usuário não existe.
let dummyHash = null;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(password), salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, salt, key] = String(stored || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scrypt(String(password), Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

/**
 * Cria o admin na primeira execução. Em produção exige ADMIN_PASSWORD;
 * em desenvolvimento usa admin/admin com aviso. Retorna false se o painel
 * deve ficar desativado.
 */
async function ensureAdminUser() {
  if (await repositories.admin.getUser()) return true;
  let { user, password } = config.admin;
  if (!password) {
    if (config.isProduction) {
      logger.warn('Painel /admin desativado: defina ADMIN_PASSWORD no .env para criar o administrador.');
      return false;
    }
    password = 'admin';
    logger.warn(`Admin criado com usuário "${user}" e senha "admin" (somente desenvolvimento). Troque a senha no painel.`);
  }
  await repositories.admin.setUser(user, await hashPassword(password));
  return true;
}

async function createSession() {
  const session = { id: crypto.randomBytes(32).toString('base64url'), expiresAt: Date.now() + SESSION_TTL };
  await repositories.admin.createSession(session.id, session.expiresAt);
  return session;
}

async function login(username, password) {
  const user = await repositories.admin.getUser();
  if (!user || user.username !== username) {
    dummyHash = dummyHash || (await hashPassword('dummy'));
    await verifyPassword(password, dummyHash);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return createSession();
}

async function getSession(id) {
  if (!id || typeof id !== 'string') return null;
  const session = await repositories.admin.findSession(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    await repositories.admin.deleteSession(id);
    return null;
  }
  return session;
}

async function logout(id) {
  if (id) await repositories.admin.deleteSession(id);
}

/** Troca a senha e encerra as outras sessões abertas. */
async function changePassword(sessionId, currentPassword, newPassword) {
  const user = await repositories.admin.getUser();
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
  await repositories.admin.setUser(user.username, await hashPassword(newPassword));
  await repositories.admin.deleteOtherSessions(sessionId);
  return true;
}

module.exports = { hashPassword, verifyPassword, ensureAdminUser, login, getSession, logout, changePassword, SESSION_TTL };
```

- [ ] **Step 5: `src/middlewares/admin-auth.js`**

```js
/**
 * Sessão do painel: cookie assinado e httpOnly restrito a /admin.
 */
const path = require('node:path');
const config = require('../config');
const auth = require('../services/auth.service');

const COOKIE = 'lenom_admin';

async function loadAdmin(req, res, next) {
  try {
    const session = await auth.getSession(req.signedCookies?.[COOKIE]);
    req.admin = session;
    res.locals.admin = session;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.admin) return next();
  return res.redirect(302, '/admin/login');
}

function setSessionCookie(res, session) {
  res.cookie(COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    signed: true,
    path: '/admin',
    expires: new Date(session.expiresAt),
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { path: '/admin' });
}

/** res.renderAdmin('plans/list', locals) -> views/admin/plans/list.ejs dentro de views/admin/layout.ejs */
function adminRender(req, res, next) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.renderAdmin = (view, locals = {}) => {
    const data = { section: null, notice: null, ...locals };
    res.render(path.join('admin', view), data, (err, body) => {
      if (err) return next(err);
      return res.render(path.join('admin', 'layout'), { ...data, body }, (layoutErr, html) =>
        (layoutErr ? next(layoutErr) : res.send(html)));
    });
  };
  next();
}

module.exports = { COOKIE, loadAdmin, requireAdmin, setSessionCookie, clearSessionCookie, adminRender };
```

- [ ] **Step 6: `src/validators/admin.validator.js` (parte de login; os demais schemas entram nas Tasks 4–6)**

```js
/**
 * Validação dos formulários do painel /admin.
 * Retorna { success, data } ou { success: false, errors: { campo: 'mensagem' } }.
 */
const { z } = require('zod');

function toFieldErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] ?? 'form';
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

const schemas = {
  login: z.object({
    username: z.string().trim().min(1, 'Informe o usuário.').max(80),
    password: z.string().min(1, 'Informe a senha.').max(200),
  }),
};

function validateAdmin(name, input) {
  const result = schemas[name].safeParse(input || {});
  return result.success ? { success: true, data: result.data } : { success: false, errors: toFieldErrors(result.error) };
}

module.exports = { validateAdmin, schemas };
```

- [ ] **Step 7: `loginLimiter` em `src/middlewares/security.js`** — acrescentar antes do `module.exports` e exportar:

```js
/** Login do painel: 10 tentativas por IP a cada 15 minutos. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).type('text/plain').send('Muitas tentativas de login. Aguarde 15 minutos.'),
});

module.exports = { securityHeaders, formLimiter, apiLimiter, loginLimiter };
```

E na CSP, permitir a fonte do banner: `styleSrc` já libera `fonts.googleapis.com` e `fontSrc` `fonts.gstatic.com` — sem mudança.

- [ ] **Step 8: `src/controllers/admin/auth.controller.js`**

```js
const auth = require('../../services/auth.service');
const { setSessionCookie, clearSessionCookie, COOKIE } = require('../../middlewares/admin-auth');
const { validateAdmin } = require('../../validators/admin.validator');

function showLogin(req, res) {
  if (req.admin) return res.redirect(302, '/admin');
  return res.renderAdmin('login', { title: 'Entrar', values: {}, errors: {}, layout: 'bare' });
}

async function submitLogin(req, res, next) {
  try {
    const result = validateAdmin('login', req.body);
    const values = { username: req.body?.username || '' };
    if (!result.success) {
      return res.status(422).renderAdmin('login', { title: 'Entrar', values, errors: result.errors, layout: 'bare' });
    }
    const session = await auth.login(result.data.username, result.data.password);
    if (!session) {
      return res.status(401).renderAdmin('login', {
        title: 'Entrar', values, errors: { form: 'Usuário ou senha inválidos.' }, layout: 'bare',
      });
    }
    setSessionCookie(res, session);
    return res.redirect(302, '/admin');
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    await auth.logout(req.signedCookies?.[COOKIE]);
    clearSessionCookie(res);
    return res.redirect(302, '/admin/login');
  } catch (err) {
    return next(err);
  }
}

module.exports = { showLogin, submitLogin, logout };
```

- [ ] **Step 9: Dashboard + rotas** — `src/controllers/admin/dashboard.controller.js`:

```js
const repositories = require('../../repositories');

async function dashboard(req, res, next) {
  try {
    const [plans, faq, testimonials, newLeads, totalLeads] = await Promise.all([
      repositories.plans.findAllAdmin(),
      repositories.faq.findAllAdmin(),
      repositories.testimonials.findAllAdmin(),
      repositories.leads.count({ status: 'new' }),
      repositories.leads.count(),
    ]);
    const latestLeads = await repositories.leads.findAll({ limit: 5 });
    res.renderAdmin('dashboard', {
      title: 'Painel',
      section: 'dashboard',
      stats: [
        { label: 'Leads novos', value: newLeads, href: '/admin/leads?status=new' },
        { label: 'Leads no total', value: totalLeads, href: '/admin/leads' },
        { label: 'Planos ativos', value: plans.filter((p) => p.active).length, href: '/admin/planos' },
        { label: 'Perguntas no FAQ', value: faq.filter((f) => f.active).length, href: '/admin/faq' },
        { label: 'Depoimentos ativos', value: testimonials.filter((t) => t.active).length, href: '/admin/depoimentos' },
      ],
      latestLeads,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { dashboard };
```

`src/routes/admin.routes.js` (as rotas de recursos entram nas Tasks 4–6):

```js
const express = require('express');
const { verifyCsrf } = require('../middlewares/csrf');
const { loginLimiter } = require('../middlewares/security');
const { loadAdmin, requireAdmin, adminRender } = require('../middlewares/admin-auth');
const authController = require('../controllers/admin/auth.controller');
const { dashboard } = require('../controllers/admin/dashboard.controller');

const router = express.Router();
const urlencoded = express.urlencoded({ extended: false, limit: '100kb' });

router.use(adminRender, loadAdmin);

router.get('/login', authController.showLogin);
router.post('/login', loginLimiter, urlencoded, verifyCsrf, authController.submitLogin);
router.post('/logout', urlencoded, verifyCsrf, authController.logout);

router.use(requireAdmin);
router.use(urlencoded, verifyCsrf);

router.get('/', dashboard);

module.exports = router;
```

- [ ] **Step 10: Montar em `src/app.js`** — depois de `app.use('/api', apiRoutes);`:

```js
  // Painel administrativo: só com o banco interno (sqlite) e com admin configurado.
  if (repositories.driver === 'sqlite') {
    app.use('/admin', adminGate, adminRoutes);
  }
```

com, no topo:

```js
const repositories = require('./repositories');
const adminRoutes = require('./routes/admin.routes');
const auth = require('./services/auth.service');
```

e dentro de `createApp`, antes do `app.use('/api'…)`:

```js
  // Cria o admin na primeira requisição ao painel; se faltar senha em produção, o painel responde 404.
  let adminReady = null;
  const adminGate = async (req, res, next) => {
    try {
      adminReady = adminReady ?? (await auth.ensureAdminUser());
      return adminReady ? next() : next('router');
    } catch (err) {
      return next(err);
    }
  };
```

Observação: `next('router')` dentro de `app.use` pula para o próximo middleware do app (cai no `notFound`). Se não funcionar com Express 5, use `return next(HttpError.notFound())` importando `./utils/http-error`.

- [ ] **Step 11: Views** — `views/admin/layout.ejs`:

```ejs
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><%= title ? title + ' | ' : '' %>Painel Lenom.AI</title>
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=lenom">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@600;700&family=Courier+Prime:wght@700&display=swap">
  <link rel="stylesheet" href="<%= asset('css/main.css') %>">
  <link rel="stylesheet" href="<%= asset('css/admin.css') %>">
  <script src="<%= asset('js/admin.js') %>" defer></script>
</head>
<body class="admin<%= locals.layout === 'bare' ? ' admin--bare' : '' %>">
  <% if (locals.layout === 'bare') { %>
    <main class="admin-auth"><%- body %></main>
  <% } else { %>
    <div class="admin-shell">
      <%- include('partials/nav') %>
      <main class="admin-main" id="conteudo">
        <header class="admin-main__header">
          <h1><%= title %></h1>
          <% if (locals.actions) { %><div class="admin-main__actions"><%- actions %></div><% } %>
        </header>
        <% if (notice) { %>
          <div class="alert alert--success" role="status"><span><%= notice %></span></div>
        <% } %>
        <%- body %>
      </main>
    </div>
  <% } %>
</body>
</html>
```

`views/admin/partials/nav.ejs`:

```ejs
<%
  const items = [
    { key: 'dashboard', label: 'Painel', href: '/admin' },
    { key: 'plans', label: 'Planos e preços', href: '/admin/planos' },
    { key: 'faq', label: 'FAQ', href: '/admin/faq' },
    { key: 'testimonials', label: 'Depoimentos', href: '/admin/depoimentos' },
    { key: 'company', label: 'Empresa', href: '/admin/empresa' },
    { key: 'leads', label: 'Leads', href: '/admin/leads' },
    { key: 'password', label: 'Trocar senha', href: '/admin/senha' },
  ];
%>
<aside class="admin-nav">
  <a class="admin-nav__brand" href="/admin">
    <img src="/images/brand/logo-dark.png" alt="Lenom.AI" width="160" height="29">
  </a>
  <nav aria-label="Painel">
    <ul>
      <% items.forEach((item) => { %>
        <li><a href="<%= item.href %>"<% if (section === item.key) { %> aria-current="page"<% } %>><%= item.label %></a></li>
      <% }) %>
    </ul>
  </nav>
  <div class="admin-nav__footer">
    <a href="/" target="_blank" rel="noopener">Ver site ↗</a>
    <form action="/admin/logout" method="post">
      <input type="hidden" name="_csrf" value="<%= csrfToken %>">
      <button type="submit" class="admin-link">Sair</button>
    </form>
  </div>
</aside>
```

`views/admin/partials/typing-banner.ejs` (símbolo = `assets-src/brand/simbolo-branco.svg` sem metadados):

```ejs
<%# Banner "Lenom.AI" digitado. Comportamento em public/js/typing-banner.js. %>
<div class="typing-banner" role="img" aria-label="Lenom.AI" data-typing-banner>
  <div class="typing-banner__inner">
    <svg class="typing-banner__symbol" viewBox="-4 -2 80 72" aria-hidden="true" focusable="false">
      <rect x="8" y="0" width="24" height="68" rx="8" fill="#5DBB46" transform="translate(20 34) skewX(-16) translate(-20 -34)"/>
      <rect x="4" y="44" width="66" height="24" rx="8" fill="#FFFFFF" transform="translate(37 56) skewX(-16) translate(-37 -56)"/>
      <g transform="translate(14 56) skewX(-16) translate(-14 -56)">
        <rect x="3" y="44" width="22" height="24" rx="8" fill="#1FA6A0"/>
        <rect x="14" y="44" width="11" height="24" fill="#1FA6A0"/>
      </g>
    </svg>
    <span class="typing-banner__name" aria-hidden="true">
      <span class="typing-banner__ghost"><span class="typing-banner__lenom">Lenom</span><span class="typing-banner__ai">.AI</span><span class="typing-banner__cursor"></span></span>
      <span class="typing-banner__typed"><span class="typing-banner__lenom" data-typed-lenom></span><span class="typing-banner__ai" data-typed-ai></span><span class="typing-banner__cursor" data-cursor></span></span>
    </span>
  </div>
</div>
```

`views/admin/login.ejs`:

```ejs
<div class="admin-login">
  <%- include('partials/typing-banner') %>
  <form class="form-card admin-login__form" action="/admin/login" method="post" novalidate>
    <h1 class="admin-login__title">Entrar no painel</h1>
    <% if (errors.form) { %>
      <div class="alert alert--error" role="alert"><span><%= errors.form %></span></div>
    <% } %>
    <input type="hidden" name="_csrf" value="<%= csrfToken %>">
    <div class="field<%= errors.username ? ' has-error' : '' %>">
      <label for="login-username">Usuário</label>
      <input class="input" id="login-username" name="username" type="text" autocomplete="username" required autofocus
             value="<%= values.username || '' %>">
      <p class="field__error"><%= errors.username || '' %></p>
    </div>
    <div class="field<%= errors.password ? ' has-error' : '' %>">
      <label for="login-password">Senha</label>
      <input class="input" id="login-password" name="password" type="password" autocomplete="current-password" required>
      <p class="field__error"><%= errors.password || '' %></p>
    </div>
    <button class="btn btn--primary admin-login__submit" type="submit">Entrar</button>
  </form>
</div>
```

`views/admin/dashboard.ejs`:

```ejs
<section class="admin-stats">
  <% stats.forEach((stat) => { %>
    <a class="admin-stat" href="<%= stat.href %>">
      <span class="admin-stat__value"><%= stat.value %></span>
      <span class="admin-stat__label"><%= stat.label %></span>
    </a>
  <% }) %>
</section>

<section class="admin-card">
  <h2>Últimos leads</h2>
  <% if (!latestLeads.length) { %>
    <p class="admin-empty">Nenhum lead recebido ainda.</p>
  <% } else { %>
    <%- include('leads/table', { leads: latestLeads }) %>
  <% } %>
</section>
```

`views/admin/leads/table.ejs` (reutilizada na Task 6):

```ejs
<div class="admin-table-wrap">
  <table class="admin-table">
    <thead><tr><th>Data</th><th>Nome</th><th>E-mail</th><th>Origem</th><th>Status</th></tr></thead>
    <tbody>
      <% leads.forEach((lead) => { %>
        <tr>
          <td><%= adminFmt.dateTime(lead.createdAt) %></td>
          <td><a href="/admin/leads/<%= lead.id %>"><%= lead.name || '—' %></a></td>
          <td><%= lead.email || '—' %></td>
          <td><%= lead.source === 'quote' ? 'Orçamento' : 'Contato' %></td>
          <td><span class="admin-badge admin-badge--<%= lead.status %>"><%= adminFmt.leadStatus(lead.status) %></span></td>
        </tr>
      <% }) %>
    </tbody>
  </table>
</div>
```

Helpers `asset`, `csrfToken` e `adminFmt` precisam estar em `res.locals` nas views do admin: em `adminRender` (Step 5), antes do `next()`, acrescentar:

```js
  res.locals.asset = asset;
  res.locals.adminFmt = adminFmt;
```

importando `const { asset } = require('../utils/assets');` e criando `src/utils/admin-format.js`:

```js
/** Formatadores das telas do painel. */
const LEAD_STATUS = { new: 'Novo', contacted: 'Em contato', closed: 'Fechado', discarded: 'Descartado' };

const dateTime = (value) =>
  value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';

const leadStatus = (status) => LEAD_STATUS[status] || status;

const money = (value) =>
  value === null || value === undefined
    ? 'Sob consulta'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/** 1290.5 -> "1.290,50" para preencher o campo de preço. */
const priceInput = (value) =>
  value === null || value === undefined
    ? ''
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

module.exports = { LEAD_STATUS, dateTime, leadStatus, money, priceInput };
```

- [ ] **Step 12: `public/js/typing-banner.js`**

```js
/**
 * Banner "Lenom.AI" digitado como máquina de escrever.
 * Ciclo: 0,7 s vazio → "Lenom" (110–220 ms/letra) → pausa 380 ms → ".AI"
 * → 3,2 s parado → apaga a 55 ms/letra → recomeça.
 */
(function () {
  const NAME = 'Lenom';
  const SUFFIX = '.AI';
  const TOTAL = NAME.length + SUFFIX.length;

  function startTypingBanner(root) {
    const lenom = root.querySelector('[data-typed-lenom]');
    const ai = root.querySelector('[data-typed-ai]');
    const cursor = root.querySelector('[data-cursor]');
    let token = 0;
    let timer = null;

    const render = (count) => {
      lenom.textContent = NAME.slice(0, Math.min(count, NAME.length));
      ai.textContent = SUFFIX.slice(0, Math.max(0, count - NAME.length));
    };
    const typing = (on) => cursor.classList.toggle('is-typing', on);
    const wait = (ms, run) => new Promise((resolve) => {
      timer = setTimeout(() => resolve(run === token), ms);
    });
    const random = () => 110 + Math.random() * 110;

    async function loop() {
      const run = ++token;
      clearTimeout(timer);
      for (;;) {
        render(0);
        typing(false);
        if (!(await wait(700, run))) return;
        typing(true);
        for (let i = 1; i <= NAME.length; i++) {
          if (!(await wait(random(), run))) return;
          render(i);
        }
        typing(false);
        if (!(await wait(380, run))) return;
        typing(true);
        for (let i = NAME.length + 1; i <= TOTAL; i++) {
          if (!(await wait(random(), run))) return;
          render(i);
        }
        typing(false);
        if (!(await wait(3200, run))) return;
        typing(true);
        for (let i = TOTAL - 1; i >= 0; i--) {
          if (!(await wait(55, run))) return;
          render(i);
        }
      }
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(TOTAL);
      return { restart() { render(TOTAL); } };
    }
    loop();
    return { restart: loop };
  }

  window.startTypingBanner = startTypingBanner;
  document.querySelectorAll('[data-typing-banner]').forEach((root) => startTypingBanner(root));
}());
```

E em `views/admin/login.ejs`, no fim: `<script src="<%= asset('js/typing-banner.js') %>" defer></script>`.

- [ ] **Step 13: `public/js/admin.js`**

```js
/** Painel: confirmação antes de excluir. */
document.addEventListener('submit', (event) => {
  const message = event.target.getAttribute('data-confirm');
  if (message && !window.confirm(message)) event.preventDefault();
});
```

- [ ] **Step 14: `public/css/admin.css`**

```css
/* ==========================================================================
   Painel administrativo — layout. Botões, campos e alertas vêm de main.css.
   ========================================================================== */
.admin { background: var(--background); }
.admin--bare { background: #0b1d33; }

/* ---------- Login ---------- */
.admin-auth { min-height: 100vh; display: grid; place-items: center; padding: var(--space-6) 16px; }
.admin-login { width: min(520px, 100%); display: grid; gap: var(--space-5); }
.admin-login__form { padding: var(--space-6); }
.admin-login__title { font-size: var(--fs-xl); margin-bottom: var(--space-4); }
.admin-login__form .field { margin-bottom: var(--space-4); }
.admin-login__submit { width: 100%; justify-content: center; }

/* ---------- Banner digitado ---------- */
.typing-banner {
  container-type: inline-size;
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 3 / 1;
  border-radius: 14px;
  background: #0f2d4a;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.typing-banner__inner { display: flex; align-items: center; gap: 3cqw; }
.typing-banner__symbol { height: 14.5cqw; width: auto; flex-shrink: 0; }
.typing-banner__name { position: relative; display: inline-block; font-size: 11.5cqw; line-height: 1; white-space: nowrap; }
.typing-banner__ghost { visibility: hidden; }
.typing-banner__typed { position: absolute; inset: 0; }
.typing-banner__lenom { font-family: 'Lexend', sans-serif; font-weight: 700; letter-spacing: -0.03em; color: #ffffff; }
.typing-banner__ai { font-family: 'Courier Prime', monospace; font-weight: 700; color: #6fd35a; }
.typing-banner__cursor {
  display: inline-block;
  width: 0.06em;
  height: 0.74em;
  margin-left: 0.05em;
  background: #6fd35a;
  vertical-align: -0.02em;
  animation: typing-blink 1s steps(1) infinite;
}
.typing-banner__cursor.is-typing { animation: none; }
@keyframes typing-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .typing-banner__cursor { animation: none; } }

/* ---------- Estrutura ---------- */
.admin-shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.admin-nav {
  display: flex; flex-direction: column; gap: var(--space-5);
  padding: var(--space-5); background: var(--navy); color: var(--on-dark);
  position: sticky; top: 0; height: 100vh;
}
.admin-nav ul { list-style: none; display: grid; gap: 2px; }
.admin-nav a { color: var(--on-dark-muted); text-decoration: none; }
.admin-nav nav a { display: block; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-weight: 500; }
.admin-nav nav a:hover { background: rgba(255, 255, 255, 0.06); color: var(--on-dark); }
.admin-nav nav a[aria-current='page'] { background: rgba(111, 209, 87, 0.14); color: var(--secondary); }
.admin-nav__footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: var(--fs-sm); }
.admin-link { background: none; border: 0; padding: 0; color: var(--on-dark-muted); font: inherit; cursor: pointer; }
.admin-link:hover { color: var(--on-dark); }

.admin-main { padding: var(--space-6) clamp(16px, 3vw, var(--space-7)); min-width: 0; }
.admin-main__header { display: flex; flex-wrap: wrap; gap: var(--space-4); justify-content: space-between; align-items: center; margin-bottom: var(--space-5); }
.admin-main__header h1 { font-size: var(--fs-2xl); }
.admin-main > .alert { margin-bottom: var(--space-5); }

.admin-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-sm); }
.admin-card + .admin-card { margin-top: var(--space-5); }
.admin-card h2 { font-size: var(--fs-lg); margin-bottom: var(--space-4); }
.admin-empty { color: var(--muted); }

/* ---------- Indicadores ---------- */
.admin-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-5); }
.admin-stat { display: grid; gap: var(--space-1); padding: var(--space-5); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); text-decoration: none; color: var(--text); }
.admin-stat:hover { border-color: var(--primary); }
.admin-stat__value { font-family: var(--font-display); font-size: var(--fs-2xl); font-weight: 700; color: var(--primary-strong); }
.admin-stat__label { color: var(--muted); font-size: var(--fs-sm); }

/* ---------- Tabelas ---------- */
.admin-table-wrap { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
.admin-table th, .admin-table td { padding: var(--space-3); text-align: left; border-bottom: 1px solid var(--border); vertical-align: middle; }
.admin-table th { color: var(--muted); font-weight: 600; white-space: nowrap; }
.admin-table td.num { text-align: right; white-space: nowrap; }
.admin-table tr.is-inactive td { color: var(--muted); }
.admin-row-actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
.admin-row-actions form { margin: 0; }

.admin-badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-pill); font-size: var(--fs-xs); font-weight: 600; background: var(--surface-soft); color: var(--text); }
.admin-badge--new, .admin-badge--on { background: var(--primary-tint); color: var(--primary-strong); }
.admin-badge--contacted { background: #e0f4f3; color: #146f6a; }
.admin-badge--closed { background: var(--success-tint); color: var(--success); }
.admin-badge--discarded, .admin-badge--off { background: #eef1f4; color: var(--muted); }

.btn--small { padding: 6px 14px; font-size: var(--fs-sm); }
.btn--danger { --btn-bg: transparent; --btn-color: var(--danger); --btn-border: var(--danger); }

/* ---------- Formulários ---------- */
.admin-form { display: grid; gap: var(--space-5); }
.admin-form .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.admin-form .field__hint { color: var(--muted); font-size: var(--fs-xs); margin: 4px 0 0; }
.admin-check { display: flex; align-items: center; gap: var(--space-2); font-weight: 500; }
.admin-check input { width: 18px; height: 18px; accent-color: var(--primary); }
.admin-form__actions { display: flex; gap: var(--space-3); align-items: center; }
.admin-filters { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4); }
.admin-filters a { padding: 6px 14px; border-radius: var(--radius-pill); border: 1px solid var(--border); text-decoration: none; color: var(--text); font-size: var(--fs-sm); }
.admin-filters a[aria-current='true'] { background: var(--navy); border-color: var(--navy); color: var(--on-dark); }
.admin-pager { display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-4); }
.admin-detail { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-5); }
.admin-detail dt { color: var(--muted); }
.admin-detail dd { margin: 0; white-space: pre-wrap; word-break: break-word; }

@media (max-width: 860px) {
  .admin-shell { grid-template-columns: 1fr; }
  .admin-nav { position: static; height: auto; }
  .admin-nav ul { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .admin-form .form-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 15: Build** — em `scripts/build-assets.js`, acrescentar às `entries`:

```js
  'css/admin.css': 'public/css/admin.css',
  'js/admin.js': 'public/js/admin.js',
  'js/typing-banner.js': 'public/js/typing-banner.js',
```

- [ ] **Step 16: Rodar** — `node --test tests/admin-http.test.js` → PASS; `npm test` → todos PASS.

- [ ] **Step 17: Commit** — `git add -A && git commit -m "feat(admin): login com sessão, layout do painel e banner digitado"`.

---

### Task 4: CRUD de planos, FAQ e depoimentos

**Files:**
- Create: `src/services/admin.service.js`, `src/controllers/admin/resource.controller.js`, `views/admin/resources/list.ejs`, `views/admin/resources/form.ejs`, `views/admin/partials/field.ejs`, `src/controllers/admin/resources.js`
- Modify: `src/validators/admin.validator.js`, `src/routes/admin.routes.js`
- Test: `tests/admin-http.test.js` (acrescentar)

**Interfaces:**
- Consumes: `repositories.{plans,faq,testimonials}` (Task 2), `validateAdmin` (Task 3), `res.renderAdmin`.
- Produces: `adminService.saved()` (limpa cache); `resourceController(definition) -> { list, newForm, create, editForm, update, remove }`; definições `plansResource`, `faqResource`, `testimonialsResource` em `src/controllers/admin/resources.js`; schemas `plan`, `faq`, `testimonial`.

- [ ] **Step 1: Testes** — acrescentar em `tests/admin-http.test.js`:

```js
async function loggedClient() {
  const client = createClient(base);
  await client.login('dono', 'senha-forte-123');
  return client;
}

test('editar preço de plano reflete na home', async () => {
  const client = await loggedClient();
  const list = await client.get('/admin/planos');
  assert.equal(list.status, 200);
  const id = list.body.match(/href="\/admin\/planos\/(\d+)"/)[1];
  const form = await client.get(`/admin/planos/${id}`);
  const value = (name) => form.body.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`))?.[1] ?? '';
  const textarea = form.body.match(/name="features"[^>]*>([\s\S]*?)<\/textarea>/)[1];

  const response = await client.post(`/admin/planos/${id}`, {
    name: value('name'), slug: value('slug'), category: 'project', icon: value('icon'), price: '1.777,00',
    billingType: 'one-time', pricePrefix: value('pricePrefix'), badge: value('badge'), description: value('description'),
    ctaText: value('ctaText'), ctaHref: value('ctaHref'), features: textarea, displayOrder: '1', active: 'on',
  });
  assert.equal(response.status, 302);
  assert.match(response.location, /^\/admin\/planos\?salvo=1/);
  const home = await (await fetch(`${base}/`)).text();
  assert.match(home, /1\.777/);
});

test('formulário inválido mostra erros por campo', async () => {
  const client = await loggedClient();
  await client.get('/admin/faq/novo');
  const response = await client.post('/admin/faq', { question: '', answer: '' });
  assert.equal(response.status, 422);
  assert.match(response.body, /Informe a pergunta/);
});

test('FAQ: criar e excluir', async () => {
  const client = await loggedClient();
  await client.get('/admin/faq/novo');
  const created = await client.post('/admin/faq', { question: 'Pergunta de teste?', answer: 'Resposta de teste.', displayOrder: '50', active: 'on' });
  assert.equal(created.status, 302);
  const list = await client.get('/admin/faq');
  assert.match(list.body, /Pergunta de teste\?/);
  const id = list.body.match(/action="\/admin\/faq\/(\d+)\/excluir"[\s\S]*?$/m) && [...list.body.matchAll(/\/admin\/faq\/(\d+)\/excluir/g)].pop()[1];
  const removed = await client.post(`/admin/faq/${id}/excluir`);
  assert.equal(removed.status, 302);
  assert.doesNotMatch((await client.get('/admin/faq')).body, /Pergunta de teste\?/);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/admin-http.test.js` → FAIL (404 em `/admin/planos`).

- [ ] **Step 3: Schemas** — em `src/validators/admin.validator.js`, acima de `const schemas`:

```js
const checkbox = z.preprocess((value) => value === 'on' || value === 'true' || value === true, z.boolean());
const text = (max, message) => z.string({ error: message }).trim().min(1, message).max(max, `Máximo de ${max} caracteres.`);
const optional = (max) => z.string().trim().max(max, `Máximo de ${max} caracteres.`).optional().default('').transform((v) => v || null);
const displayOrder = z.coerce.number({ error: 'Use um número.' }).int('Use um número inteiro.').min(0).max(9999).default(0);

/** Aceita "1290", "1290.5", "1.290", "1.290,50", "R$ 1.290,50". Vazio = null (sob consulta). */
function parsePrice(value) {
  const clean = String(value ?? '').replace(/R\$|\s/g, '');
  if (clean === '') return null;
  let number;
  if (clean.includes(',')) number = Number(clean.replace(/\./g, '').replace(',', '.'));
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) number = Number(clean.replace(/\./g, ''));
  else number = Number(clean);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : Number.NaN;
}

const link = z.string().trim().max(255)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v), 'Use um caminho do site (/orcamento) ou um link https://.')
  .optional().default('').transform((v) => v || null);
```

e dentro de `schemas`:

```js
  plan: z.object({
    name: text(120, 'Informe o nome do plano.'),
    slug: z.string().trim().toLowerCase().min(1, 'Informe o slug.').max(140)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.'),
    category: z.enum(['project', 'saas'], { error: 'Escolha a categoria.' }),
    icon: optional(60),
    price: z.string().optional().default('').transform(parsePrice)
      .refine((v) => !Number.isNaN(v), 'Preço inválido. Exemplos: 1290 ou 1.290,00.'),
    billingType: z.enum(['one-time', 'starting-at', 'monthly', 'custom'], { error: 'Escolha o tipo de cobrança.' }),
    pricePrefix: optional(40),
    highlighted: checkbox,
    badge: optional(40),
    description: optional(255),
    ctaText: optional(60),
    ctaHref: link,
    features: z.string().optional().default('')
      .transform((v) => v.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
      .pipe(z.array(z.string().max(200, 'Cada item pode ter até 200 caracteres.')).max(30, 'Máximo de 30 itens.')),
    active: checkbox,
    displayOrder,
  }).superRefine((plan, ctx) => {
    if (plan.billingType !== 'custom' && plan.price === null) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'Informe o preço ou escolha "Sob consulta".' });
    }
    if (plan.billingType === 'custom') plan.price = null;
  }),
  faq: z.object({
    question: text(255, 'Informe a pergunta.'),
    answer: text(2000, 'Informe a resposta.'),
    active: checkbox,
    displayOrder,
  }),
  testimonial: z.object({
    author: text(120, 'Informe quem deu o depoimento.'),
    role: optional(120),
    company: optional(120),
    content: text(1000, 'Informe o depoimento.'),
    rating: z.coerce.number().int().min(1, 'Nota de 1 a 5.').max(5, 'Nota de 1 a 5.').default(5),
    active: checkbox,
    displayOrder,
  }),
```

- [ ] **Step 4: `src/services/admin.service.js`**

```js
/**
 * Regras do painel que valem para todas as telas.
 */
const { forget } = require('../utils/cache');

/** Chamado após qualquer alteração: limpa o cache para o site refletir na hora. */
function saved() {
  forget();
}

module.exports = { saved };
```

- [ ] **Step 5: `views/admin/partials/field.ejs`**

```ejs
<%#
  Campo de formulário do painel.
  params: name, label, value, errors, type ('text'|'number'|'email'|'textarea'|'select'|'checkbox'),
          options [{ value, label }], hint, required, rows, full (ocupa a linha inteira), attrs
%>
<%
  const id = 'f-' + name;
  const error = (locals.errors || {})[name];
  const type = locals.type || 'text';
  const val = locals.value === null || locals.value === undefined ? '' : locals.value;
%>
<% if (type === 'checkbox') { %>
  <div class="field<%= locals.full ? ' field--full' : '' %>">
    <label class="admin-check"><input type="checkbox" name="<%= name %>" <%= val ? 'checked' : '' %>> <%= label %></label>
    <% if (locals.hint) { %><p class="field__hint"><%= hint %></p><% } %>
  </div>
<% } else { %>
  <div class="field<%= locals.full ? ' field--full' : '' %><%= error ? ' has-error' : '' %>">
    <label for="<%= id %>"><%= label %><% if (locals.required) { %> <span class="req" aria-hidden="true">*</span><% } %></label>
    <% if (type === 'textarea') { %>
      <textarea class="textarea" id="<%= id %>" name="<%= name %>" rows="<%= locals.rows || 4 %>"<%- error ? ' aria-invalid="true"' : '' %>><%= val %></textarea>
    <% } else if (type === 'select') { %>
      <select class="select" id="<%= id %>" name="<%= name %>"<%- error ? ' aria-invalid="true"' : '' %>>
        <% options.forEach((option) => { %>
          <option value="<%= option.value %>"<%= String(option.value) === String(val) ? ' selected' : '' %>><%= option.label %></option>
        <% }) %>
      </select>
    <% } else { %>
      <input class="input" id="<%= id %>" name="<%= name %>" type="<%= type %>" value="<%= val %>"<%- locals.attrs || '' %><%- error ? ' aria-invalid="true"' : '' %>>
    <% } %>
    <% if (locals.hint) { %><p class="field__hint"><%= hint %></p><% } %>
    <p class="field__error"><%= error || '' %></p>
  </div>
<% } %>
```

- [ ] **Step 6: `src/controllers/admin/resource.controller.js`**

```js
/**
 * Controller genérico de cadastro (listar, criar, editar, excluir) usado por
 * planos, FAQ e depoimentos. Cada recurso descreve suas colunas e campos.
 */
const HttpError = require('../../utils/http-error');
const adminService = require('../../services/admin.service');
const { validateAdmin } = require('../../validators/admin.validator');

const isUniqueError = (err) => err?.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(err.message);

function resourceController(def) {
  const base = `/admin/${def.path}`;

  async function findOr404(id) {
    const item = await def.repo().findById(id);
    if (!item) throw HttpError.notFound(`${def.singular} não encontrado.`);
    return item;
  }

  const renderForm = (res, status, { item, values, errors }) =>
    res.status(status).renderAdmin('resources/form', {
      title: item ? `Editar ${def.singular.toLowerCase()}` : `Novo ${def.singular.toLowerCase()}`,
      section: def.section,
      def,
      action: item ? `${base}/${item.id}` : base,
      values,
      errors,
    });

  async function save(req, res, next, item) {
    try {
      const result = validateAdmin(def.schema, req.body);
      if (!result.success) return renderForm(res, 422, { item, values: req.body, errors: result.errors });
      try {
        if (item) await def.repo().update(item.id, result.data);
        else await def.repo().create(result.data);
      } catch (err) {
        if (isUniqueError(err) && def.uniqueField) {
          return renderForm(res, 422, { item, values: req.body, errors: { [def.uniqueField]: 'Já existe um cadastro com este valor.' } });
        }
        throw err;
      }
      adminService.saved();
      return res.redirect(302, `${base}?salvo=1`);
    } catch (err) {
      return next(err);
    }
  }

  return {
    async list(req, res, next) {
      try {
        const items = await def.repo().findAllAdmin();
        res.renderAdmin('resources/list', {
          title: def.plural,
          section: def.section,
          def,
          items,
          notice: req.query.salvo ? 'Alterações salvas.' : req.query.excluido ? 'Item excluído.' : null,
        });
      } catch (err) {
        next(err);
      }
    },
    newForm(req, res) {
      renderForm(res, 200, { item: null, values: def.toForm(def.defaults), errors: {} });
    },
    create(req, res, next) {
      return save(req, res, next, null);
    },
    async editForm(req, res, next) {
      try {
        const item = await findOr404(req.params.id);
        renderForm(res, 200, { item, values: def.toForm(item), errors: {} });
      } catch (err) {
        next(err);
      }
    },
    async update(req, res, next) {
      try {
        return save(req, res, next, await findOr404(req.params.id));
      } catch (err) {
        return next(err);
      }
    },
    async remove(req, res, next) {
      try {
        await findOr404(req.params.id);
        await def.repo().remove(req.params.id);
        adminService.saved();
        res.redirect(302, `${base}?excluido=1`);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { resourceController };
```

- [ ] **Step 7: `src/controllers/admin/resources.js`** — definições dos três recursos:

```js
/**
 * Descrição das telas de cadastro do painel: colunas da lista e campos do formulário.
 */
const repositories = require('../../repositories');
const { money, priceInput } = require('../../utils/admin-format');
const { resourceController } = require('./resource.controller');

const BILLING = [
  { value: 'one-time', label: 'Pagamento único' },
  { value: 'starting-at', label: 'A partir de' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'custom', label: 'Sob consulta' },
];
const CATEGORIES = [
  { value: 'project', label: 'Projeto (home)' },
  { value: 'saas', label: 'SaaS (/planos)' },
];
const status = (item) => (item.active ? { badge: 'on', text: 'Ativo' } : { badge: 'off', text: 'Inativo' });

const plans = resourceController({
  path: 'planos',
  section: 'plans',
  singular: 'Plano',
  plural: 'Planos e preços',
  schema: 'plan',
  uniqueField: 'slug',
  repo: () => repositories.plans,
  columns: [
    { label: 'Ordem', value: (p) => p.displayOrder, num: true },
    { label: 'Nome', value: (p) => p.name, link: true },
    { label: 'Categoria', value: (p) => (p.category === 'saas' ? 'SaaS' : 'Projeto') },
    { label: 'Preço', value: (p) => (p.billingType === 'custom' ? 'Sob consulta' : `${money(p.price)}${p.billingType === 'monthly' ? '/mês' : ''}`), num: true },
    { label: 'Destaque', value: (p) => (p.highlighted ? 'Sim' : '—') },
  ],
  status,
  defaults: { category: 'project', billingType: 'one-time', features: [], active: true, highlighted: false, displayOrder: 0, ctaText: 'Quero este plano' },
  toForm: (p) => ({ ...p, price: priceInput(p.price), features: (p.features || []).join('\n') }),
  fields: [
    { name: 'name', label: 'Nome', required: true },
    { name: 'slug', label: 'Slug (endereço)', required: true, hint: 'Ex.: site-institucional. Usado nos links de orçamento.' },
    { name: 'category', label: 'Categoria', type: 'select', options: CATEGORIES },
    { name: 'billingType', label: 'Tipo de cobrança', type: 'select', options: BILLING },
    { name: 'price', label: 'Preço (R$)', hint: 'Ex.: 1.290,00. Deixe vazio só para "Sob consulta".', attrs: ' inputmode="decimal"' },
    { name: 'pricePrefix', label: 'Texto antes do preço', hint: 'Ex.: A partir de' },
    { name: 'description', label: 'Descrição curta', full: true },
    { name: 'features', label: 'Itens inclusos', type: 'textarea', rows: 8, full: true, hint: 'Um item por linha.' },
    { name: 'badge', label: 'Selo', hint: 'Ex.: Mais vendido' },
    { name: 'icon', label: 'Ícone', hint: 'Nome do ícone do sprite (ex.: layout, building).' },
    { name: 'ctaText', label: 'Texto do botão' },
    { name: 'ctaHref', label: 'Link do botão', hint: 'Ex.: /orcamento?plano=landing-page' },
    { name: 'displayOrder', label: 'Ordem', type: 'number' },
    { name: 'highlighted', label: 'Destacar este plano', type: 'checkbox' },
    { name: 'active', label: 'Exibir no site', type: 'checkbox' },
  ],
});

const faq = resourceController({
  path: 'faq',
  section: 'faq',
  singular: 'Pergunta',
  plural: 'Perguntas frequentes',
  schema: 'faq',
  repo: () => repositories.faq,
  columns: [
    { label: 'Ordem', value: (f) => f.displayOrder, num: true },
    { label: 'Pergunta', value: (f) => f.question, link: true },
  ],
  status,
  defaults: { active: true, displayOrder: 0 },
  toForm: (f) => ({ ...f }),
  fields: [
    { name: 'question', label: 'Pergunta', required: true, full: true },
    { name: 'answer', label: 'Resposta', type: 'textarea', rows: 6, required: true, full: true },
    { name: 'displayOrder', label: 'Ordem', type: 'number' },
    { name: 'active', label: 'Exibir no site', type: 'checkbox' },
  ],
});

const testimonials = resourceController({
  path: 'depoimentos',
  section: 'testimonials',
  singular: 'Depoimento',
  plural: 'Depoimentos',
  schema: 'testimonial',
  repo: () => repositories.testimonials,
  columns: [
    { label: 'Ordem', value: (t) => t.displayOrder, num: true },
    { label: 'Autor', value: (t) => t.author, link: true },
    { label: 'Cargo / empresa', value: (t) => [t.role, t.company].filter(Boolean).join(' — ') || '—' },
    { label: 'Nota', value: (t) => '★'.repeat(t.rating) },
  ],
  status,
  defaults: { rating: 5, active: true, displayOrder: 0 },
  toForm: (t) => ({ ...t }),
  fields: [
    { name: 'author', label: 'Autor', required: true },
    { name: 'role', label: 'Cargo' },
    { name: 'company', label: 'Empresa' },
    { name: 'rating', label: 'Nota', type: 'select', options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} estrela${n > 1 ? 's' : ''}` })) },
    { name: 'content', label: 'Depoimento', type: 'textarea', rows: 5, required: true, full: true },
    { name: 'displayOrder', label: 'Ordem', type: 'number' },
    { name: 'active', label: 'Exibir no site', type: 'checkbox' },
  ],
});

module.exports = { plans, faq, testimonials };
```

- [ ] **Step 8: Views genéricas** — `views/admin/resources/list.ejs`:

```ejs
<div class="admin-main__toolbar">
  <a class="btn btn--primary btn--small" href="/admin/<%= def.path %>/novo">+ Novo <%= def.singular.toLowerCase() %></a>
</div>
<section class="admin-card">
  <% if (!items.length) { %>
    <p class="admin-empty">Nenhum cadastro ainda.</p>
  <% } else { %>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <% def.columns.forEach((column) => { %><th<%= column.num ? ' class=num' : '' %>><%= column.label %></th><% }) %>
            <th>Status</th>
            <th class="num">Ações</th>
          </tr>
        </thead>
        <tbody>
          <% items.forEach((item) => { const st = def.status(item); %>
            <tr<%- item.active ? '' : ' class="is-inactive"' %>>
              <% def.columns.forEach((column) => { %>
                <td<%- column.num ? ' class="num"' : '' %>>
                  <% if (column.link) { %><a href="/admin/<%= def.path %>/<%= item.id %>"><%= column.value(item) %></a><% } else { %><%= column.value(item) %><% } %>
                </td>
              <% }) %>
              <td><span class="admin-badge admin-badge--<%= st.badge %>"><%= st.text %></span></td>
              <td>
                <div class="admin-row-actions">
                  <a class="btn btn--outline btn--small" href="/admin/<%= def.path %>/<%= item.id %>">Editar</a>
                  <form action="/admin/<%= def.path %>/<%= item.id %>/excluir" method="post" data-confirm="Excluir este item? Esta ação não pode ser desfeita.">
                    <input type="hidden" name="_csrf" value="<%= csrfToken %>">
                    <button class="btn btn--danger btn--small" type="submit">Excluir</button>
                  </form>
                </div>
              </td>
            </tr>
          <% }) %>
        </tbody>
      </table>
    </div>
  <% } %>
</section>
```

`views/admin/resources/form.ejs`:

```ejs
<form class="admin-card admin-form" action="<%= action %>" method="post" novalidate>
  <% if (Object.keys(errors).length) { %>
    <div class="alert alert--error" role="alert"><span>Verifique os campos destacados.</span></div>
  <% } %>
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <div class="form-grid">
    <% def.fields.forEach((field) => { %>
      <%- include('../partials/field', { ...field, value: values[field.name], errors }) %>
    <% }) %>
  </div>
  <div class="admin-form__actions">
    <button class="btn btn--primary" type="submit">Salvar</button>
    <a class="btn btn--outline" href="/admin/<%= def.path %>">Cancelar</a>
  </div>
</form>
```

Acrescentar em `admin.css`: `.admin-main__toolbar { display: flex; justify-content: flex-end; margin-bottom: var(--space-4); }`.

- [ ] **Step 9: Rotas** — em `src/routes/admin.routes.js`, depois de `router.get('/', dashboard);`:

```js
const resources = require('../controllers/admin/resources');

for (const [path, controller] of [['planos', resources.plans], ['faq', resources.faq], ['depoimentos', resources.testimonials]]) {
  router.get(`/${path}`, controller.list);
  router.get(`/${path}/novo`, controller.newForm);
  router.post(`/${path}`, controller.create);
  router.get(`/${path}/:id`, controller.editForm);
  router.post(`/${path}/:id`, controller.update);
  router.post(`/${path}/:id/excluir`, controller.remove);
}
```

(O `require` vai no topo do arquivo junto dos outros.) `:id` não numérico cai em `findById` → `null` → 404.

- [ ] **Step 10: Rodar** — `npm test` → PASS.

- [ ] **Step 11: Commit** — `git add -A && git commit -m "feat(admin): cadastro de planos, FAQ e depoimentos"`.

---

### Task 5: Dados da empresa

**Files:**
- Create: `src/controllers/admin/company.controller.js`, `views/admin/company.ejs`
- Modify: `src/validators/admin.validator.js`, `src/routes/admin.routes.js`
- Test: `tests/admin-http.test.js`

**Interfaces:**
- Consumes: `repositories.company.get/update`, `adminService.saved`, `validateAdmin('company', body)`.
- Produces: rotas `GET/POST /admin/empresa`.

- [ ] **Step 1: Teste**

```js
test('dados da empresa: salvar telefone reflete no site', async () => {
  const client = await loggedClient();
  const form = await client.get('/admin/empresa');
  assert.equal(form.status, 200);
  const value = (name) => form.body.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`))?.[1] ?? '';
  const fields = Object.fromEntries(['companyName', 'legalName', 'tagline', 'email', 'whatsapp', 'whatsappMessage', 'instagram',
    'linkedin', 'youtube', 'address', 'city', 'state', 'serviceArea', 'openingHours', 'businessHoursLabel'].map((n) => [n, value(n)]));
  const response = await client.post('/admin/empresa', { ...fields, phone: '(21) 99999-1234' });
  assert.equal(response.status, 302);
  assert.match(await (await fetch(`${base}/contato`)).text(), /\(21\) 99999-1234/);
});
```

- [ ] **Step 2: Rodar e ver falhar** — 404.

- [ ] **Step 3: Schema `company`** (dentro de `schemas`):

```js
  company: z.object({
    companyName: text(120, 'Informe o nome da empresa.'),
    legalName: optional(160),
    tagline: optional(200),
    email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido.')),
    phone: optional(30),
    whatsapp: z.string().transform((v) => v.replace(/\D/g, ''))
      .refine((v) => v === '' || (v.length >= 10 && v.length <= 13), 'Use DDD + número, ex.: 11987654321.'),
    whatsappMessage: optional(500),
    instagram: link,
    linkedin: link,
    youtube: link,
    address: optional(200),
    city: optional(80),
    state: z.string().trim().toUpperCase().max(2, 'Use a sigla, ex.: SP.').optional().default(''),
    serviceArea: optional(120),
    openingHours: optional(80),
    businessHoursLabel: optional(120),
  }),
```

O `link` aceita caminho relativo; para redes sociais o refine dele já exige `/` ou `https://`, o que basta.

- [ ] **Step 4: Controller**

```js
const repositories = require('../../repositories');
const adminService = require('../../services/admin.service');
const { validateAdmin } = require('../../validators/admin.validator');

const render = (res, status, { values, errors, notice = null }) =>
  res.status(status).renderAdmin('company', { title: 'Dados da empresa', section: 'company', values, errors, notice });

async function show(req, res, next) {
  try {
    render(res, 200, { values: await repositories.company.get(), errors: {}, notice: req.query.salvo ? 'Dados salvos.' : null });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = validateAdmin('company', req.body);
    if (!result.success) return render(res, 422, { values: req.body, errors: result.errors });
    const current = await repositories.company.get();
    await repositories.company.update({ ...current, ...result.data });
    adminService.saved();
    return res.redirect(302, '/admin/empresa?salvo=1');
  } catch (err) {
    return next(err);
  }
}

module.exports = { show, update };
```

- [ ] **Step 5: View `views/admin/company.ejs`**

```ejs
<%
  const fields = [
    { name: 'companyName', label: 'Nome da empresa', required: true },
    { name: 'legalName', label: 'Razão social' },
    { name: 'tagline', label: 'Frase de apresentação', full: true },
    { name: 'email', label: 'E-mail de contato', type: 'email', required: true },
    { name: 'phone', label: 'Telefone (exibido no site)' },
    { name: 'whatsapp', label: 'WhatsApp', hint: 'Com DDD. Ex.: 11987654321' },
    { name: 'whatsappMessage', label: 'Mensagem inicial do WhatsApp', type: 'textarea', rows: 2, full: true },
    { name: 'instagram', label: 'Instagram (link)' },
    { name: 'linkedin', label: 'LinkedIn (link)' },
    { name: 'youtube', label: 'YouTube (link)' },
    { name: 'address', label: 'Endereço' },
    { name: 'city', label: 'Cidade' },
    { name: 'state', label: 'UF' },
    { name: 'serviceArea', label: 'Área de atendimento' },
    { name: 'businessHoursLabel', label: 'Horário (texto exibido)', hint: 'Ex.: Segunda a sexta, das 9h às 18h' },
    { name: 'openingHours', label: 'Horário (formato Google)', hint: 'Ex.: Mo-Fr 09:00-18:00' },
  ];
%>
<form class="admin-card admin-form" action="/admin/empresa" method="post" novalidate>
  <% if (Object.keys(errors).length) { %>
    <div class="alert alert--error" role="alert"><span>Verifique os campos destacados.</span></div>
  <% } %>
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <div class="form-grid">
    <% fields.forEach((field) => { %>
      <%- include('partials/field', { ...field, value: values[field.name], errors }) %>
    <% }) %>
  </div>
  <div class="admin-form__actions">
    <button class="btn btn--primary" type="submit">Salvar</button>
  </div>
</form>
```

- [ ] **Step 6: Rotas** — `router.get('/empresa', company.show); router.post('/empresa', company.update);` com `const company = require('../controllers/admin/company.controller');`.

- [ ] **Step 7: Rodar** — `npm test` → PASS.

- [ ] **Step 8: Commit** — `git commit -am "feat(admin): edição dos dados da empresa"` (com `git add` dos novos).

---

### Task 6: Leads e troca de senha

**Files:**
- Create: `src/controllers/admin/leads.controller.js`, `src/controllers/admin/password.controller.js`, `views/admin/leads/list.ejs`, `views/admin/leads/show.ejs`, `views/admin/password.ejs`
- Modify: `src/validators/admin.validator.js`, `src/routes/admin.routes.js`
- Test: `tests/admin-http.test.js`

**Interfaces:**
- Consumes: `repositories.leads.*`, `auth.changePassword(sessionId, current, next)`, `LEAD_STATUS`, `adminFmt`, `forms.labelOf`.
- Produces: rotas `GET /admin/leads`, `GET /admin/leads/:id`, `POST /admin/leads/:id/status`, `GET/POST /admin/senha`.

- [ ] **Step 1: Testes**

```js
test('lead enviado pelo site aparece no painel e muda de status', async () => {
  const visitor = createClient(base);
  await visitor.get('/contato');
  await visitor.post('/contato', {
    name: 'Cliente Painel', email: 'cliente@painel.com', whatsapp: '(11) 98888-7777',
    projectType: 'landing-page', message: 'Quero uma landing page.', acceptPrivacy: 'on',
  });
  const client = await loggedClient();
  const list = await client.get('/admin/leads');
  assert.match(list.body, /Cliente Painel/);
  const id = list.body.match(/href="\/admin\/leads\/(\d+)"[^>]*>Cliente Painel/)[1];
  const detail = await client.get(`/admin/leads/${id}`);
  assert.match(detail.body, /Quero uma landing page\./);
  const changed = await client.post(`/admin/leads/${id}/status`, { status: 'contacted' });
  assert.equal(changed.status, 302);
  assert.match((await client.get('/admin/leads?status=contacted')).body, /Cliente Painel/);
});

test('troca de senha exige a senha atual', async () => {
  const client = await loggedClient();
  await client.get('/admin/senha');
  const wrong = await client.post('/admin/senha', { currentPassword: 'x', newPassword: 'nova-senha-123', confirmPassword: 'nova-senha-123' });
  assert.equal(wrong.status, 422);
  assert.match(wrong.body, /Senha atual incorreta/);
  const ok = await client.post('/admin/senha', { currentPassword: 'senha-forte-123', newPassword: 'nova-senha-123', confirmPassword: 'nova-senha-123' });
  assert.equal(ok.status, 302);
  const relogin = createClient(base);
  assert.equal((await relogin.login('dono', 'nova-senha-123')).status, 302);
  // volta a senha para não afetar outros testes
  await client.get('/admin/senha');
  await client.post('/admin/senha', { currentPassword: 'nova-senha-123', newPassword: 'senha-forte-123', confirmPassword: 'senha-forte-123' });
});
```

Observação: o teste de lead usa os campos obrigatórios de `validateContact`; se o validador exigir outros (ver `src/validators/lead.validator.js`), incluir no POST.

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Schemas** (dentro de `schemas`):

```js
  leadStatus: z.object({
    status: z.enum(['new', 'contacted', 'closed', 'discarded'], { error: 'Status inválido.' }),
  }),
  password: z.object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z.string().min(8, 'A nova senha precisa ter pelo menos 8 caracteres.').max(200),
    confirmPassword: z.string(),
  }).refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não conferem.' }),
```

- [ ] **Step 4: `src/controllers/admin/leads.controller.js`**

```js
const repositories = require('../../repositories');
const forms = require('../../config/forms');
const HttpError = require('../../utils/http-error');
const { LEAD_STATUS } = require('../../utils/admin-format');
const { validateAdmin } = require('../../validators/admin.validator');

const PAGE_SIZE = 25;

async function list(req, res, next) {
  try {
    const status = LEAD_STATUS[req.query.status] ? req.query.status : undefined;
    const page = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
    const [leads, total] = await Promise.all([
      repositories.leads.findAll({ status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      repositories.leads.count({ status }),
    ]);
    res.renderAdmin('leads/list', {
      title: 'Leads',
      section: 'leads',
      leads,
      status,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      statuses: LEAD_STATUS,
    });
  } catch (err) {
    next(err);
  }
}

/** Linhas exibidas no detalhe, com os rótulos dos selects do site. */
function detailRows(lead) {
  const projectTypes = lead.source === 'quote' ? forms.quoteProjectTypes : forms.contactProjectTypes;
  return [
    ['Origem', lead.source === 'quote' ? 'Formulário de orçamento' : 'Formulário de contato'],
    ['Nome', lead.name],
    ['Empresa', lead.company],
    ['E-mail', lead.email],
    ['Telefone / WhatsApp', lead.phone],
    ['Tipo de projeto', lead.projectType && forms.labelOf(projectTypes, lead.projectType)],
    ['Plano de interesse', lead.planSlug],
    ['Prazo', lead.deadline && forms.labelOf(forms.deadlines, lead.deadline)],
    ['Orçamento', lead.budgetRange && forms.labelOf(forms.budgetRanges, lead.budgetRange)],
    ['Mensagem', lead.message],
    ['Anexo', lead.attachment && `${lead.attachment.originalName} (storage/uploads/${lead.attachment.storedName})`],
    ['IP', lead.ipAddress],
  ].filter(([, value]) => value);
}

async function show(req, res, next) {
  try {
    const lead = await repositories.leads.findById(req.params.id);
    if (!lead) throw HttpError.notFound('Lead não encontrado.');
    res.renderAdmin('leads/show', {
      title: `Lead #${lead.id}`,
      section: 'leads',
      lead,
      rows: detailRows(lead),
      statuses: LEAD_STATUS,
      notice: req.query.salvo ? 'Status atualizado.' : null,
    });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const lead = await repositories.leads.findById(req.params.id);
    if (!lead) throw HttpError.notFound('Lead não encontrado.');
    const result = validateAdmin('leadStatus', req.body);
    if (!result.success) throw HttpError.badRequest(result.errors.status);
    await repositories.leads.updateStatus(lead.id, result.data.status);
    res.redirect(302, `/admin/leads/${lead.id}?salvo=1`);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, show, updateStatus };
```

Conferir que `forms.labelOf` e `forms.deadlines` existem em `src/config/forms.js` (são usados por `lead.service.js`).

- [ ] **Step 5: Views de leads** — `views/admin/leads/list.ejs`:

```ejs
<nav class="admin-filters" aria-label="Filtrar por status">
  <a href="/admin/leads"<%- !status ? ' aria-current="true"' : '' %>>Todos</a>
  <% Object.entries(statuses).forEach(([value, label]) => { %>
    <a href="/admin/leads?status=<%= value %>"<%- status === value ? ' aria-current="true"' : '' %>><%= label %></a>
  <% }) %>
</nav>
<section class="admin-card">
  <% if (!leads.length) { %>
    <p class="admin-empty">Nenhum lead<%= status ? ' com este status' : '' %>.</p>
  <% } else { %>
    <%- include('table', { leads }) %>
    <% if (pages > 1) { const q = status ? '&status=' + status : ''; %>
      <nav class="admin-pager" aria-label="Paginação">
        <% if (page > 1) { %><a class="btn btn--outline btn--small" href="/admin/leads?pagina=<%= page - 1 %><%= q %>">← Anteriores</a><% } %>
        <span>Página <%= page %> de <%= pages %></span>
        <% if (page < pages) { %><a class="btn btn--outline btn--small" href="/admin/leads?pagina=<%= page + 1 %><%= q %>">Próximos →</a><% } %>
      </nav>
    <% } %>
  <% } %>
</section>
```

`views/admin/leads/show.ejs`:

```ejs
<section class="admin-card">
  <dl class="admin-detail">
    <dt>Recebido em</dt><dd><%= adminFmt.dateTime(lead.createdAt) %></dd>
    <% rows.forEach(([label, value]) => { %>
      <dt><%= label %></dt><dd><%= value %></dd>
    <% }) %>
  </dl>
</section>
<form class="admin-card admin-form" action="/admin/leads/<%= lead.id %>/status" method="post">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <div class="form-grid">
    <%- include('../partials/field', {
      name: 'status', label: 'Status', type: 'select', value: lead.status, errors: {},
      options: Object.entries(statuses).map(([value, label]) => ({ value, label })),
    }) %>
  </div>
  <div class="admin-form__actions">
    <button class="btn btn--primary" type="submit">Atualizar status</button>
    <a class="btn btn--outline" href="/admin/leads">Voltar</a>
  </div>
</form>
```

- [ ] **Step 6: `src/controllers/admin/password.controller.js`**

```js
const auth = require('../../services/auth.service');
const { validateAdmin } = require('../../validators/admin.validator');

const render = (res, status, { errors = {}, notice = null } = {}) =>
  res.status(status).renderAdmin('password', { title: 'Trocar senha', section: 'password', errors, notice });

function show(req, res) {
  render(res, 200, { notice: req.query.salvo ? 'Senha alterada. Outras sessões abertas foram encerradas.' : null });
}

async function update(req, res, next) {
  try {
    const result = validateAdmin('password', req.body);
    if (!result.success) return render(res, 422, { errors: result.errors });
    const changed = await auth.changePassword(req.admin.id, result.data.currentPassword, result.data.newPassword);
    if (!changed) return render(res, 422, { errors: { currentPassword: 'Senha atual incorreta.' } });
    return res.redirect(302, '/admin/senha?salvo=1');
  } catch (err) {
    return next(err);
  }
}

module.exports = { show, update };
```

`views/admin/password.ejs`:

```ejs
<form class="admin-card admin-form" action="/admin/senha" method="post" novalidate>
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <div class="form-grid">
    <%- include('partials/field', { name: 'currentPassword', label: 'Senha atual', type: 'password', errors, full: true, attrs: ' autocomplete="current-password"' }) %>
    <%- include('partials/field', { name: 'newPassword', label: 'Nova senha', type: 'password', errors, hint: 'Mínimo de 8 caracteres.', attrs: ' autocomplete="new-password"' }) %>
    <%- include('partials/field', { name: 'confirmPassword', label: 'Confirme a nova senha', type: 'password', errors, attrs: ' autocomplete="new-password"' }) %>
  </div>
  <div class="admin-form__actions">
    <button class="btn btn--primary" type="submit">Trocar senha</button>
  </div>
</form>
```

- [ ] **Step 7: Rotas**

```js
router.get('/leads', leadsController.list);
router.get('/leads/:id', leadsController.show);
router.post('/leads/:id/status', leadsController.updateStatus);
router.get('/senha', password.show);
router.post('/senha', password.update);
```

com `const leadsController = require('../controllers/admin/leads.controller');` e `const password = require('../controllers/admin/password.controller');`.

- [ ] **Step 8: Rodar** — `npm test` → PASS.

- [ ] **Step 9: Commit** — `git add -A && git commit -m "feat(admin): leads e troca de senha"`.

---

### Task 7: Banner avulso, documentação e verificação no navegador

**Files:**
- Create: `assets-src/banner-lenom.html`
- Modify: `.env.example`, `.env` (local, não versionado), `README.md`, `docs/superpowers/specs/2026-10-06-admin-panel-design.md`

- [ ] **Step 1: `assets-src/banner-lenom.html`** — arquivo único com o CSS de `.typing-banner*` (Task 3, Step 14), o SVG do símbolo (Task 3, Step 11), o script de `public/js/typing-banner.js` (Task 3, Step 12) embutidos, mais:
  - `body { margin: 0; min-height: 100vh; display: grid; place-content: center; gap: 16px; padding: 16px; background: #0b1d33; box-sizing: border-box; }` e `.typing-banner { width: min(1200px, calc(100vw - 32px)); }` para não haver rolagem horizontal;
  - botão `<button type="button" class="replay">Digitar de novo</button>` discreto (fundo transparente, borda `rgba(255,255,255,.25)`, texto `rgba(255,255,255,.75)`, 14px), centralizado, que chama `banner.restart()`;
  - fontes `Lexend:wght@700` e `Courier+Prime:wght@700` do Google Fonts.

- [ ] **Step 2: `.env.example`** — trocar o bloco "Fonte de dados" por:

```
# ------------------------------------------------------------------
# Fonte de dados
#   sqlite -> banco interno em storage/lenom.db (padrão; habilita o painel /admin)
#   mock   -> somente leitura de src/data/mock
#   mysql  -> MySQL via Sequelize
# ------------------------------------------------------------------
DATA_DRIVER=sqlite
# Caminho do arquivo SQLite (opcional)
# DATA_FILE=storage/lenom.db

# ------------------------------------------------------------------
# Painel administrativo (/admin)
#   Usuário e senha usados para criar o admin na primeira execução.
#   Depois, troque a senha pelo próprio painel. Em produção ADMIN_PASSWORD é obrigatório.
# ------------------------------------------------------------------
ADMIN_USER=admin
ADMIN_PASSWORD=
```

No `.env` local: trocar `USE_MOCK_DATA=true` por `DATA_DRIVER=sqlite` e acrescentar `ADMIN_USER=admin` / `ADMIN_PASSWORD=` (vazio → admin/admin em desenvolvimento).

- [ ] **Step 3: README** — seção "Painel administrativo": acesso em `/admin`, credenciais iniciais, o que dá para editar, onde fica o banco (`storage/lenom.db`, faça backup copiando o arquivo), e o banner avulso em `assets-src/banner-lenom.html`. Ajustar menções a `USE_MOCK_DATA` para `DATA_DRIVER`.

- [ ] **Step 4: Spec** — trocar `public/banner-lenom.html` por `assets-src/banner-lenom.html` e explicar o motivo (CSP).

- [ ] **Step 5: Verificação** — `npm test`; reiniciar o servidor de preview; abrir `/admin/login` (banner animando, cursor piscando), entrar com admin/admin, editar o preço de um plano e conferir a home; conferir `/admin` em largura de celular (375px); abrir `assets-src/banner-lenom.html` direto no navegador.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "docs(admin): banner avulso, .env.example e README do painel"`.
