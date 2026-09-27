const { TABLE_OPTIONS, id, timestamps } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'site_sections',
      {
        id: id(Sequelize),
        key: { type: Sequelize.STRING(60), allowNull: false, unique: true },
        content: { type: Sequelize.JSON, allowNull: false },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('site_sections');
  },
};
