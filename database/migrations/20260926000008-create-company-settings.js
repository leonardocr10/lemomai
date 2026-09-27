const { TABLE_OPTIONS, id, timestamps } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'company_settings',
      {
        id: id(Sequelize),
        company_name: { type: Sequelize.STRING(120), allowNull: false },
        legal_name: { type: Sequelize.STRING(160) },
        tagline: { type: Sequelize.STRING(255) },
        logo: { type: Sequelize.STRING(255) },
        email: { type: Sequelize.STRING(160) },
        phone: { type: Sequelize.STRING(30) },
        whatsapp: { type: Sequelize.STRING(20), comment: 'Somente dígitos com DDI, ex.: 5511987654321' },
        whatsapp_message: { type: Sequelize.STRING(255) },
        instagram: { type: Sequelize.STRING(255) },
        linkedin: { type: Sequelize.STRING(255) },
        youtube: { type: Sequelize.STRING(255) },
        address: { type: Sequelize.STRING(255) },
        city: { type: Sequelize.STRING(120) },
        state: { type: Sequelize.STRING(2) },
        country: { type: Sequelize.STRING(2), defaultValue: 'BR' },
        service_area: { type: Sequelize.STRING(120) },
        opening_hours: { type: Sequelize.STRING(120) },
        business_hours_label: { type: Sequelize.STRING(120) },
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('company_settings');
  },
};
