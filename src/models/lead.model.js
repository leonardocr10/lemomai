const json = require('./_json');

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Lead',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      source: { type: DataTypes.ENUM('contact', 'quote'), allowNull: false, defaultValue: 'contact' },
      name: { type: DataTypes.STRING(120), allowNull: false },
      company: { type: DataTypes.STRING(120) },
      email: { type: DataTypes.STRING(160), allowNull: false },
      phone: { type: DataTypes.STRING(30) },
      projectType: { type: DataTypes.STRING(60) },
      budgetRange: { type: DataTypes.STRING(60) },
      deadline: { type: DataTypes.STRING(60) },
      planSlug: { type: DataTypes.STRING(140) },
      message: { type: DataTypes.TEXT },
      attachment: json(DataTypes, 'attachment', null),
      status: {
        type: DataTypes.ENUM('new', 'contacted', 'proposal', 'won', 'lost'),
        allowNull: false,
        defaultValue: 'new',
      },
      ipAddress: { type: DataTypes.STRING(45) },
      userAgent: { type: DataTypes.STRING(255) },
    },
    { tableName: 'leads' },
  );
