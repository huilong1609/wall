const { DataTypes } = require('sequelize');


module.exports = (sequelize) => {
const Signal = sequelize.define('Signal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  providerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SignalProviders',
      key: 'id',
    },
  },
  pair: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('buy', 'sell', 'long', 'short', 'close'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'closed', 'cancelled', 'expired'),
    defaultValue: 'active',
  },
  entryPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
  },
  currentPrice: {
    type: DataTypes.DECIMAL(20, 8),
  },
  exitPrice: {
    type: DataTypes.DECIMAL(20, 8),
  },
  stopLoss: {
    type: DataTypes.DECIMAL(20, 8),
  },
  takeProfit1: {
    type: DataTypes.DECIMAL(20, 8),
  },
  takeProfit2: {
    type: DataTypes.DECIMAL(20, 8),
  },
  takeProfit3: {
    type: DataTypes.DECIMAL(20, 8),
  },
  leverage: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  timeframe: {
    type: DataTypes.STRING, // e.g., "1h", "4h", "1d"
  },
  profitLoss: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
  },
  profitLossPercent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  riskRewardRatio: {
    type: DataTypes.DECIMAL(10, 2),
  },
  analysis: {
    type: DataTypes.TEXT,
  },
  imageUrl: {
    type: DataTypes.STRING,
  },
  tags: {
    type: DataTypes.TEXT, // JSON array of tags
  },
  confidence: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  closedAt: {
    type: DataTypes.DATE,
  },
  expiresAt: {
    type: DataTypes.DATE,
  },
  subscribersTaken: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  successfulTrades: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['providerId'] },
    { fields: ['pair'] },
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['createdAt'] },
  ],
});
  return Signal
}


