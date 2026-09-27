const json = require('./_json');

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'SiteSection',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      key: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      content: json(DataTypes, 'content', {}),
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'site_sections' },
  );
