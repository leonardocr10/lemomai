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
