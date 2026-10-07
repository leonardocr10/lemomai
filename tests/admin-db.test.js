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
