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

/** Busca "contém" com LIKE: %, _ e ! digitados são tratados como texto (escape = !). */
const likeTerm = (q) => `%${String(q).replace(/[!%_]/g, (char) => `!${char}`)}%`;
const searchClause = (columns, q) => ({
  sql: `(${columns.map((column) => `${column} LIKE ? ESCAPE '!'`).join(' OR ')})`,
  params: columns.map(() => likeTerm(q)),
});

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
    /**
     * Lista do painel (inclui inativos). sort/searchColumns só aceitam colunas
     * declaradas em def.columns — nunca texto livre no SQL.
     */
    async findPage({ q = '', searchColumns = [], sort, dir = 'asc', limit = 25, offset = 0 } = {}) {
      const allowed = (key) => def.columns.includes(key) || key === 'id' || key === 'createdAt' || key === 'updatedAt';
      const columns = searchColumns.filter(allowed).map(toSnake);
      const where = q && columns.length ? searchClause(columns, q) : { sql: '1 = 1', params: [] };
      const order = sort && allowed(sort)
        ? `ORDER BY ${toSnake(sort)} ${dir === 'desc' ? 'DESC' : 'ASC'}, id ASC`
        : ORDER;
      const db = getDb();
      const total = db.prepare(`SELECT COUNT(*) AS n FROM ${def.table} WHERE ${where.sql}`).get(...where.params).n;
      const items = db.prepare(`SELECT * FROM ${def.table} WHERE ${where.sql} ${order} LIMIT ? OFFSET ?`)
        .all(...where.params, limit, offset).map(decode);
      return { items, total };
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
  (row
    ? { ...JSON.parse(row.data), id: row.id, source: row.source, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }
    : null);

const LEAD_SORT = { createdAt: 'created_at', name: 'name', email: 'email', status: 'status', source: 'source' };

function leadFilter({ status, q } = {}) {
  const parts = [];
  const params = [];
  if (status) {
    parts.push('status = ?');
    params.push(status);
  }
  if (q) {
    const search = searchClause(['name', 'email', 'data'], q);
    parts.push(search.sql);
    params.push(...search.params);
  }
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
}

const leads = {
  async create(lead) {
    const { status = 'new', ...data } = lead;
    const now = new Date().toISOString();
    const result = getDb()
      .prepare('INSERT INTO leads (source, status, name, email, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(data.source, status, data.name || null, data.email || null, JSON.stringify(data), now, now);
    return leads.findById(result.lastInsertRowid);
  },
  async findAll({ status, q, sort = 'createdAt', dir = 'desc', limit = 1000, offset = 0 } = {}) {
    const { sql, params } = leadFilter({ status, q });
    const column = LEAD_SORT[sort] || 'created_at';
    const direction = dir === 'asc' ? 'ASC' : 'DESC';
    return getDb()
      .prepare(`SELECT * FROM leads ${sql} ORDER BY ${column} ${direction}, id ${direction} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map(decodeLead);
  },
  async count({ status, q } = {}) {
    const { sql, params } = leadFilter({ status, q });
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
  banners: table(TABLES.banners),
  company,
  leads,
  admin,
};
