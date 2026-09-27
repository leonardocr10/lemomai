const { TABLE_OPTIONS, id, timestamps, ordering } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'portfolio_projects',
      {
        id: id(Sequelize),
        name: { type: Sequelize.STRING(120), allowNull: false },
        slug: { type: Sequelize.STRING(140), allowNull: false, unique: true },
        category: { type: Sequelize.STRING(80) },
        segment: { type: Sequelize.STRING(120) },
        description: { type: Sequelize.TEXT },
        challenge: { type: Sequelize.TEXT },
        solution: { type: Sequelize.TEXT },
        technologies: { type: Sequelize.JSON },
        cover_image: { type: Sequelize.STRING(255) },
        screenshots: { type: Sequelize.JSON },
        results: { type: Sequelize.JSON },
        ...ordering(Sequelize),
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex('portfolio_projects', ['active', 'display_order']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('portfolio_projects');
  },
};
