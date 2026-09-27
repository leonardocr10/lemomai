const { TABLE_OPTIONS, id, timestamps, ordering } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'services',
      {
        id: id(Sequelize),
        name: { type: Sequelize.STRING(120), allowNull: false },
        slug: { type: Sequelize.STRING(140), allowNull: false, unique: true },
        short_description: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT },
        icon: { type: Sequelize.STRING(60) },
        features: { type: Sequelize.JSON },
        ...ordering(Sequelize),
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex('services', ['active', 'display_order']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('services');
  },
};
