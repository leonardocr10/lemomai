const { TABLE_OPTIONS, id, timestamps, ordering } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'testimonials',
      {
        id: id(Sequelize),
        author: { type: Sequelize.STRING(120), allowNull: false },
        role: { type: Sequelize.STRING(120) },
        company: { type: Sequelize.STRING(120) },
        content: { type: Sequelize.TEXT, allowNull: false },
        rating: { type: Sequelize.TINYINT.UNSIGNED, defaultValue: 5 },
        avatar: { type: Sequelize.STRING(255) },
        ...ordering(Sequelize),
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('testimonials');
  },
};
