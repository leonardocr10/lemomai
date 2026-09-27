module.exports = (sequelize, DataTypes) => {
  const PlanFeature = sequelize.define(
    'PlanFeature',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      planId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      feature: { type: DataTypes.STRING(255), allowNull: false },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'plan_features', timestamps: false },
  );

  PlanFeature.associate = ({ Plan }) => {
    PlanFeature.belongsTo(Plan, { as: 'plan', foreignKey: 'planId' });
  };

  return PlanFeature;
};
