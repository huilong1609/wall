'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserPlan = sequelize.define('UserPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id', },
    planId: { type: DataTypes.UUID, allowNull: false, references: { model: 'plans', key: 'id' }, field: 'plan_id' },
    reference: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
    exchangeRate: { type: DataTypes.DECIMAL(15, 6), field: 'exchange_rate' },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled', 'paused', 'ended'),
      allowNull: false,
      defaultValue: 'pending',
    },
    investmentDuration: { type: DataTypes.JSONB, field: 'investment_duration' },
    roi: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0.0 },
    totalReturn: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0.0, field: 'total_return' },
    autoReinvest: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'auto_reinvest' },
    metadata: { type: DataTypes.JSONB },
    activatedAt: { type: DataTypes.DATE, field: 'activated_at' },
    endDate: { type: DataTypes.DATE, field: 'end_date' },
    lastPayoutAt: { type: DataTypes.DATE, field: 'last_payout_at' },
  }, {
    tableName: 'user_plans',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['reference'] },
      { fields: ['user_id'] },
      { fields: ['plan_id'] },
      { fields: ['status'] },
      { fields: ['activated_at'] },
    ],
  });

  UserPlan.associate = (models) => {
    UserPlan.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    UserPlan.belongsTo(models.Plan, { foreignKey: 'plan_id', as: 'plan' });
  };

  return UserPlan;
};
