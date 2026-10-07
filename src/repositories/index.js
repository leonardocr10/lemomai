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
