'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100) },
    tagline: {type: DataTypes.TEXT },
    description: {type: DataTypes.TEXT },
    price: { type: DataTypes.DECIMAL(20,4), allowNull: false },
    maxPrice: { type: DataTypes.STRING(50), field: 'max_price' },
    features: { type: DataTypes.JSONB },
    limits: {type: DataTypes.JSONB},
    highlight: { type: DataTypes.BOOLEAN, defaultValue: false },
    type: { type: DataTypes.ENUM('Main' , 'Promo') },
    roi: { type: DataTypes.DECIMAL(20, 4) },
    roiType: {type:DataTypes.ENUM('percent' , 'flat'), defaultValue: 'percent' , field: 'roi_type'},
    roiInterval: { type: DataTypes.ENUM('hourly', 'daily' , 'weekly' , 'biweekly', 'monthly' , 'annually'), field: 'roi_interval' },
    duration: { type: DataTypes.INTEGER },
    durationType: { type: DataTypes.ENUM('hour' , 'day' ,'week' , 'month' , 'year'), field: 'duration_type' },
    config: { type: DataTypes.JSONB },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'plans',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Plan.associate = (models) => {
    Plan.hasMany(models.UserPlan, { foreignKey: 'plan_id', as: 'userPlans' });
  };

  return Plan;
};
