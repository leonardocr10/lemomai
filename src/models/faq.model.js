module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Faq',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      question: { type: DataTypes.STRING(255), allowNull: false },
      answer: { type: DataTypes.TEXT, allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'faq', freezeTableName: true },
  );
