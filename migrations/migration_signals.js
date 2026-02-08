'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Signals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      providerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'SignalProviders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      pair: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('buy', 'sell', 'long', 'short', 'close'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'closed', 'cancelled', 'expired'),
        defaultValue: 'active',
      },
      entryPrice: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
      },
      currentPrice: {
        type: Sequelize.DECIMAL(20, 8),
      },
      exitPrice: {
        type: Sequelize.DECIMAL(20, 8),
      },
      stopLoss: {
        type: Sequelize.DECIMAL(20, 8),
      },
      takeProfit1: {
        type: Sequelize.DECIMAL(20, 8),
      },
      takeProfit2: {
        type: Sequelize.DECIMAL(20, 8),
      },
      takeProfit3: {
        type: Sequelize.DECIMAL(20, 8),
      },
      leverage: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      timeframe: {
        type: Sequelize.STRING,
      },
      profitLoss: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      profitLossPercent: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      riskRewardRatio: {
        type: Sequelize.DECIMAL(10, 2),
      },
      analysis: {
        type: Sequelize.TEXT,
      },
      imageUrl: {
        type: Sequelize.STRING,
      },
      tags: {
        type: Sequelize.TEXT,
      },
      confidence: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
      },
      closedAt: {
        type: Sequelize.DATE,
      },
      expiresAt: {
        type: Sequelize.DATE,
      },
      subscribersTaken: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      successfulTrades: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('Signals', ['providerId']);
    await queryInterface.addIndex('Signals', ['pair']);
    await queryInterface.addIndex('Signals', ['status']);
    await queryInterface.addIndex('Signals', ['type']);
    await queryInterface.addIndex('Signals', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Signals');
  },
};