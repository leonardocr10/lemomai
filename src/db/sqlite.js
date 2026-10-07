/**
 * Banco interno (SQLite nativo do Node). Um arquivo em storage/lenom.db,
 * criado e populado automaticamente na primeira abertura.
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const { SCHEMA, migrate } = require('./schema');
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
  migrate(db);
  seed(db, { withLeads: !inMemory });
  return db;
}

function closeDb() {
  if (db) db.close();
  db = null;
}

module.exports = { getDb, closeDb };
