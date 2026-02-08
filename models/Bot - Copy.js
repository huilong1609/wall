const { DataTypes } = require('sequelize');
const { generateOrderId } = require('../utils/helpers');

module.exports = (sequelize) => {
  const Bot = sequelize.define('Bot', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    category: {
      type: DataTypes.ENUM('grid', 'dca', 'arbitrage', 'scalping', 'trend', 'custom'),
      allowNull: false,
    },
    strategy: {
      type: DataTypes.TEXT, // JSON stringified strategy config
      allowNull: false,
    },
    pair: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    exchange: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'binance',
    },
    status: {
      type: DataTypes.ENUM('draft', 'running', 'paused', 'stopped', 'error'),
      defaultValue: 'draft',
    },
    capital: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
    },
    currentValue: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
    },
    profit: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
    },
    profitPercent: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    winningTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    losingTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    winRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    maxDrawdown: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    runtime: {
      type: DataTypes.INTEGER, // in seconds
      defaultValue: 0,
    },
    startedAt: {
      type: DataTypes.DATE,
    },
    stoppedAt: {
      type: DataTypes.DATE,
    },
    lastTradeAt: {
      type: DataTypes.DATE,
    },
    config: {
      type: DataTypes.TEXT, // JSON stringified bot config
    },
    riskSettings: {
      type: DataTypes.TEXT, // JSON stringified risk settings
    },
    errorMessage: {
      type: DataTypes.TEXT,
    },
    performanceData: {
      type: DataTypes.TEXT, // JSON stringified performance history
    },
  }, {
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['pair'] },
      { fields: ['category'] },
    ],
  });
  return Bot
}


