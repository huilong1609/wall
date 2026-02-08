const { DataTypes } = require('sequelize');


module.exports = (sequelize) => {
   const BotSubscription = sequelize.define('BotSubscription', {
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
  botMarketplaceId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'bot_marketplace_id',
    references: {
      model: 'BotMarketplaces',
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
  rating: {
    type: DataTypes.INTEGER, // User's rating of the bot (1-5)
  },
  review: {
    type: DataTypes.TEXT,
  },
  reviewedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: "BotSubscriptions",
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['botMarketplaceId'] },
    { fields: ['status'] },
  ],
});
  return BotSubscription
}


