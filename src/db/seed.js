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
