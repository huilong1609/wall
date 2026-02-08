const { DataTypes } = require('sequelize');


module.exports = (sequelize) => {
const SignalSubscription = sequelize.define('SignalSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  providerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SignalProviders',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired', 'suspended'),
    defaultValue: 'active',
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  pricePeriod: {
    type: DataTypes.ENUM('free', 'month', 'year', 'lifetime'),
    defaultValue: 'month',
  },
  lastPaymentDate: {
    type: DataTypes.DATE,
  },
  nextPaymentDate: {
    type: DataTypes.DATE,
  },
  notificationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  autoCopyEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  autoCopyConfig: {
    type: DataTypes.TEXT, // JSON config for auto-copy trading
  },
  signalsTaken: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  profitLoss: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
  },
  rating: {
    type: DataTypes.INTEGER, // User's rating of the provider (1-5)
  },
  review: {
    type: DataTypes.TEXT,
  },
  reviewedAt: {
    type: DataTypes.DATE,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['providerId'] },
    { fields: ['status'] },
  ],
});
return SignalSubscription
}
