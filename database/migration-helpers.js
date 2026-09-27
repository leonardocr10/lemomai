/**
 * Utilitários compartilhados pelas migrations. Fica fora de migrations/
 * porque o sequelize-cli executa todo arquivo .js daquela pasta.
 */
const TABLE_OPTIONS = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci', engine: 'InnoDB' };

const id = (Sequelize) => ({
  type: Sequelize.INTEGER.UNSIGNED,
  autoIncrement: true,
  primaryKey: true,
  allowNull: false,
});

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
  },
});

const ordering = (Sequelize) => ({
  active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
  display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
});

module.exports = { TABLE_OPTIONS, id, timestamps, ordering };
