/**
 * Inicialização preguiçosa do Sequelize: a conexão só é criada quando um
 * repositório MySQL é usado. Com USE_MOCK_DATA=true o banco nunca é tocado.
 */
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config');
const dbConfig = require('../config/database')[config.env] || require('../config/database').development;

const definitions = [
  require('./service.model'),
  require('./plan.model'),
  require('./plan-feature.model'),
  require('./portfolio-project.model'),
  require('./testimonial.model'),
  require('./faq.model'),
  require('./lead.model'),
  require('./company-setting.model'),
  require('./site-section.model'),
];

let sequelize = null;
let models = null;

function getSequelize() {
  if (!sequelize) {
    sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);
  }
  return sequelize;
}

function getModels() {
  if (models) return models;
  const instance = getSequelize();
  models = {};
  for (const define of definitions) {
    const model = define(instance, DataTypes);
    models[model.name] = model;
  }
  for (const model of Object.values(models)) {
    if (typeof model.associate === 'function') model.associate(models);
  }
  return models;
}

async function closeDatabase() {
  if (sequelize) await sequelize.close();
}

module.exports = { getSequelize, getModels, closeDatabase };
