module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Testimonial',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      author: { type: DataTypes.STRING(120), allowNull: false },
      role: { type: DataTypes.STRING(120) },
      company: { type: DataTypes.STRING(120) },
      content: { type: DataTypes.TEXT, allowNull: false },
      rating: { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 5 },
      avatar: { type: DataTypes.STRING(255) },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'testimonials' },
  );
