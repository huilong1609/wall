'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('trader_profiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      display_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      avatar: {
        type: Sequelize.STRING(500),
      },
      bio: {
        type: Sequelize.TEXT,
      },
      trading_style: {
        type: Sequelize.STRING(100),
      },
      markets: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      badge: {
        type: Sequelize.ENUM('none', 'rising_star', 'consistent', 'pro', 'expert', 'elite'),
        defaultValue: 'none',
      },
      risk_level: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
      },
      
      // Stats
      total_followers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_copiers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_trades: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      win_rate: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
      },
      profit_7d: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      profit_30d: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      profit_90d: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      profit_all: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      max_drawdown: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
      },
      avg_trade_size: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },

      // Settings
      min_copy_amount: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 100,
      },
      performance_fee: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0.2,
      },
      accepting_copiers: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
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
    await queryInterface.addIndex('trader_profiles', ['status']);
    await queryInterface.addIndex('trader_profiles', ['badge']);
    await queryInterface.addIndex('trader_profiles', ['risk_level']);
    await queryInterface.addIndex('trader_profiles', ['profit_30d']);
    await queryInterface.addIndex('trader_profiles', ['total_copiers']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trader_profiles');
  }
};
