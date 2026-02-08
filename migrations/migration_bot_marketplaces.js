'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('BotMarketplaces', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM('grid', 'dca', 'arbitrage', 'scalping', 'trend', 'custom'),
        allowNull: false,
      },
      creator: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      creator_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0,
      },
      reviews: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      users: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      price_period: {
        type: Sequelize.ENUM('free', 'month', 'year', 'lifetime'),
        defaultValue: 'month',
      },
      tier: {
        type: Sequelize.ENUM('free', 'standard', 'premium'),
        defaultValue: 'standard',
      },
      performance: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      supported_pairs: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      supported_exchanges: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      features: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      min_capital: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
      },
      tags: {
        type: Sequelize.TEXT,
      },
      strategy_code: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      default_config: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      chart_data: {
        type: Sequelize.TEXT,
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      downloads: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      active_instances: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('BotMarketplaces', ['category']);
    await queryInterface.addIndex('BotMarketplaces', ['tier']);
    await queryInterface.addIndex('BotMarketplaces', ['isPublished']);
    await queryInterface.addIndex('BotMarketplaces', ['isFeatured']);
    await queryInterface.addIndex('BotMarketplaces', ['rating']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('BotMarketplaces');
  },
};