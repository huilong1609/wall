'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assets', {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('crypto', 'fiat', 'stock', 'forex', 'commodity'),
        allowNull: false,
      },
      icon: {
        type: Sequelize.STRING(500),
      },
      decimals: {
        type: Sequelize.INTEGER,
        defaultValue: 8,
      },
      
      // Market Data
      price: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      price_change_24h: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      price_change_percent_24h: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
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
      market_cap: {
        type: Sequelize.DECIMAL(30, 2),
      },
      circulating_supply: {
        type: Sequelize.DECIMAL(30, 8),
      },
      total_supply: {
        type: Sequelize.DECIMAL(30, 8),
      },
      max_supply: {
        type: Sequelize.DECIMAL(30, 8),
      },
      rank: {
        type: Sequelize.INTEGER,
      },

      // Network Info
      networks: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },

      // Deposit/Withdrawal Settings
      deposit_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      withdrawal_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      min_deposit: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      min_withdrawal: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      withdrawal_fee: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      confirmations: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },

      // Trading Settings
      trading_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      
      // Status
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'delisting'),
        defaultValue: 'active',
      },

      // External IDs
      coingecko_id: {
        type: Sequelize.STRING(100),
      },

      // Last Updated
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
    await queryInterface.addIndex('assets', ['symbol']);
    await queryInterface.addIndex('assets', ['type']);
    await queryInterface.addIndex('assets', ['status']);
    await queryInterface.addIndex('assets', ['rank']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('assets');
  }
};
