/**
 * Ponto único de escolha da fonte de dados.
 *
 *   USE_MOCK_DATA=true  -> repositories/mock   (sem banco)
 *   USE_MOCK_DATA=false -> repositories/mysql  (Sequelize + MySQL)
 *
 * Services importam SEMPRE deste arquivo; nenhuma outra parte do código
 * precisa saber de onde os dados vêm.
 */
const config = require('../config');

const driver = config.useMockData ? 'mock' : 'mysql';

module.exports = require(`./${driver}`);
module.exports.driver = driver;
