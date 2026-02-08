'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('trading_pairs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      symbol: {
        type: Sequelize.STRING(20),
        unique: true,
        allowNull: false,
      },
      base_asset: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      quote_asset: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      market: {
        type: Sequelize.ENUM('spot', 'futures', 'margin', 'forex', 'stocks'),
        allowNull: false,
      },

      // Price Info
      price: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      bid_price: {
        type: Sequelize.DECIMAL(30, 18),
      },
      ask_price: {
        type: Sequelize.DECIMAL(30, 18),
      },
      price_change_24h: {
        type: Sequelize.DECIMAL(30, 18),
      },
      price_change_percent_24h: {
        type: Sequelize.DECIMAL(10, 4),
      },
      high_24h: {
        type: Sequelize.DECIMAL(30, 18),
      },
      low_24h: {
        type: Sequelize.DECIMAL(30, 18),
      },
      volume_24h: {
        type: Sequelize.DECIMAL(30, 18),
      },
      quote_volume_24h: {
        type: Sequelize.DECIMAL(30, 18),
      },

      // Trading Rules
      min_quantity: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      max_quantity: {
        type: Sequelize.DECIMAL(30, 18),
      },
      step_size: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0.00000001,
      },
      min_notional: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 10,
      },
      tick_size: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0.01,
      },

      // Decimals
      price_precision: {
        type: Sequelize.INTEGER,
        defaultValue: 8,
      },
      quantity_precision: {
        type: Sequelize.INTEGER,
        defaultValue: 8,
      },

      // Fees
      maker_fee: {
        type: Sequelize.DECIMAL(10, 6),
        defaultValue: 0.001,
      },
      taker_fee: {
        type: Sequelize.DECIMAL(10, 6),
        defaultValue: 0.001,
      },

      // Futures specific
      max_leverage: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      maintenance_margin_rate: {
        type: Sequelize.DECIMAL(10, 6),
      },

      // Status
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'halt'),
        defaultValue: 'active',
      },
      trading_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },

      // Popularity
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },

      price_updated_at: {
        type: Sequelize.DATE,
      },

      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },

      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('trading_pairs', ['symbol']);
    await queryInterface.addIndex('trading_pairs', ['base_asset']);
    await queryInterface.addIndex('trading_pairs', ['quote_asset']);
    await queryInterface.addIndex('trading_pairs', ['market']);
    await queryInterface.addIndex('trading_pairs', ['status']);
    await queryInterface.addIndex('trading_pairs', ['is_featured']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trading_pairs');
  }
};
