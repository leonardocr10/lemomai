const { TABLE_OPTIONS, id, timestamps, ordering } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'plans',
      {
        id: id(Sequelize),
        name: { type: Sequelize.STRING(120), allowNull: false },
        slug: { type: Sequelize.STRING(140), allowNull: false, unique: true },
        category: { type: Sequelize.ENUM('project', 'saas'), allowNull: false, defaultValue: 'project' },
        icon: { type: Sequelize.STRING(60) },
        price: { type: Sequelize.DECIMAL(10, 2), allowNull: true, comment: 'NULL = sob consulta' },
        billing_type: {
          type: Sequelize.ENUM('one-time', 'starting-at', 'monthly', 'custom'),
          allowNull: false,
          defaultValue: 'one-time',
        },
        price_prefix: { type: Sequelize.STRING(40) },
        highlighted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        badge: { type: Sequelize.STRING(40) },
        description: { type: Sequelize.STRING(255) },
        cta_text: { type: Sequelize.STRING(60) },
        cta_href: { type: Sequelize.STRING(255) },
        ...ordering(Sequelize),
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex('plans', ['category', 'active', 'display_order']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('plans');
  },
};
