const json = require('./_json');

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Service',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
      shortDescription: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT },
      icon: { type: DataTypes.STRING(60) },
      features: json(DataTypes, 'features', []),
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'services' },
  );
