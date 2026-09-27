module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    'Plan',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
      category: { type: DataTypes.ENUM('project', 'saas'), allowNull: false, defaultValue: 'project' },
      icon: { type: DataTypes.STRING(60) },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      billingType: {
        type: DataTypes.ENUM('one-time', 'starting-at', 'monthly', 'custom'),
        allowNull: false,
        defaultValue: 'one-time',
      },
      pricePrefix: { type: DataTypes.STRING(40) },
      highlighted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      badge: { type: DataTypes.STRING(40) },
      description: { type: DataTypes.STRING(255) },
      ctaText: { type: DataTypes.STRING(60) },
      ctaHref: { type: DataTypes.STRING(255) },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'plans' },
  );

  Plan.associate = ({ PlanFeature }) => {
    Plan.hasMany(PlanFeature, { as: 'features', foreignKey: 'planId', onDelete: 'CASCADE' });
  };

  return Plan;
};
