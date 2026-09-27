const { TABLE_OPTIONS, id, timestamps, ordering } = require('../migration-helpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'faq',
      {
        id: id(Sequelize),
        question: { type: Sequelize.STRING(255), allowNull: false },
        answer: { type: Sequelize.TEXT, allowNull: false },
        ...ordering(Sequelize),
        ...timestamps(Sequelize),
      },
      TABLE_OPTIONS,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('faq');
  },
};
