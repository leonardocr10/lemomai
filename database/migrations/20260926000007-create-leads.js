const { TABLE_OPTIONS, id, timestamps } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'leads',
      {
        id: id(Sequelize),
        source: { type: Sequelize.ENUM('contact', 'quote'), allowNull: false, defaultValue: 'contact' },
        name: { type: Sequelize.STRING(120), allowNull: false },
        company: { type: Sequelize.STRING(120) },
        email: { type: Sequelize.STRING(160), allowNull: false },
        phone: { type: Sequelize.STRING(30) },
        project_type: { type: Sequelize.STRING(60) },
        budget_range: { type: Sequelize.STRING(60) },
        deadline: { type: Sequelize.STRING(60) },
        plan_slug: { type: Sequelize.STRING(140) },
        message: { type: Sequelize.TEXT },
        attachment: { type: Sequelize.JSON, comment: 'Metadados do anexo (arquivo em storage/uploads)' },
        status: {
          type: Sequelize.ENUM('new', 'contacted', 'proposal', 'won', 'lost'),
          allowNull: false,
          defaultValue: 'new',
        },
        ip_address: { type: Sequelize.STRING(45) },
        user_agent: { type: Sequelize.STRING(255) },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
    await queryInterface.addIndex('leads', ['status', 'created_at']);
    await queryInterface.addIndex('leads', ['email']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('leads');
  },
};
