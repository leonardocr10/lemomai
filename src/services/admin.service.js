/**
 * Regras do painel que valem para todas as telas.
 */
const { forget } = require('../utils/cache');

/** Chamado após qualquer alteração: limpa o cache para o site refletir na hora. */
function saved() {
  forget();
}

module.exports = { saved };
