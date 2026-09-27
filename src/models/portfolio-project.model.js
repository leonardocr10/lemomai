const json = require('./_json');

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'PortfolioProject',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
      category: { type: DataTypes.STRING(80) },
      segment: { type: DataTypes.STRING(120) },
      description: { type: DataTypes.TEXT },
      challenge: { type: DataTypes.TEXT },
      solution: { type: DataTypes.TEXT },
      technologies: json(DataTypes, 'technologies', []),
      coverImage: { type: DataTypes.STRING(255) },
      screenshots: json(DataTypes, 'screenshots', []),
      results: json(DataTypes, 'results', []),
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'portfolio_projects' },
  );
