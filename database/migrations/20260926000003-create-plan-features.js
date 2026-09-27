const { TABLE_OPTIONS, id } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'plan_features',
      {
        id: id(Sequelize),
        plan_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'plans', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        feature: { type: Sequelize.STRING(255), allowNull: false },
        display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex('plan_features', ['plan_id', 'display_order']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('plan_features');
  },
};
