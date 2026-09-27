/**
 * Configuração do Sequelize. Usada pela aplicação (src/models) e pelo
 * sequelize-cli (migrations/seeds), por isso exporta um objeto por ambiente.
 */
const config = require('./index');

const base = {
  username: config.db.user,
  password: config.db.password,
  database: config.db.name,
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  logging: config.db.logging ? console.log : false,
  timezone: '-03:00',
  define: {
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  dialectOptions: { charset: 'utf8mb4' },
  pool: { max: 10, min: 0, idle: 10000 },
  migrationStorageTableName: 'sequelize_meta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_data',
};

module.exports = {
  development: base,
  test: { ...base, database: `${config.db.name}_test` },
  production: base,
};
