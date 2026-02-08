'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SignalProviders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      provider:{
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      avatar: {
        type: Sequelize.STRING,
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0,
      },
      totalSignals: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      successfulSignals: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      winRate: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
      },
      avgProfitPercent: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      totalProfit: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      subscribers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      pricePeriod: {
        type: Sequelize.ENUM('free', 'month', 'year', 'lifetime'),
        defaultValue: 'month',
      },
      tier: {
        type: Sequelize.ENUM('free', 'basic', 'premium', 'elite'),
        defaultValue: 'basic',
      },
      specialties: {
        type: Sequelize.TEXT,
      },
      supportedPairs: {
        type: Sequelize.TEXT,
      },
      tradingStyle: {
        type: Sequelize.STRING,
      },
      experience: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      telegramChannel: {
        type: Sequelize.STRING,
      },
      discordServer: {
        type: Sequelize.STRING,
      },
      website: {
        type: Sequelize.STRING,
      },
      performanceData: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('SignalProviders', ['verified']);
    await queryInterface.addIndex('SignalProviders', ['status']);
    await queryInterface.addIndex('SignalProviders', ['tier']);
    await queryInterface.addIndex('SignalProviders', ['winRate']);
    await queryInterface.addIndex('SignalProviders', ['rating']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SignalProviders');
  },
};