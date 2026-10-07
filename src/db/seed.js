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

/**
 * Banners de exemplo do site ficam em /images/banners/. Quando um conjunto novo
 * é publicado (src/data/mock/banners.mock.js), bancos já criados trocam os
 * exemplos antigos pelos novos. Banners enviados pelo painel (/uploads/...)
 * nunca são tocados, e um exemplo atual excluído pelo painel não volta.
 */
function replaceLegacyBanners(db) {
  const current = require('../data/mock/banners.mock');
  const currentImages = new Set(current.map((banner) => banner.image));
  const legacy = db.prepare("SELECT id, image FROM banners WHERE image LIKE '/images/banners/%'").all()
    .filter((row) => !currentImages.has(row.image));
  if (!legacy.length) return;
  const remove = db.prepare('DELETE FROM banners WHERE id = ?');
  for (const row of legacy) remove.run(row.id);
  const existing = new Set(db.prepare('SELECT image FROM banners').all().map((row) => row.image));
  for (const banner of current) {
    if (!existing.has(banner.image)) insert(db, TABLES.banners, banner);
  }
}

function seed(db, { withLeads = true } = {}) {
  db.exec('BEGIN');
  try {
    seedCollection(db, TABLES.plans, require('../data/mock/plans.mock'));
    seedCollection(db, TABLES.faq, require('../data/mock/faq.mock'));
    seedCollection(db, TABLES.testimonials, require('../data/mock/testimonials.mock'));
    seedCollection(db, TABLES.banners, require('../data/mock/banners.mock'));
    replaceLegacyBanners(db);
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
