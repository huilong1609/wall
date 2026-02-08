'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('trades', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      trade_id: {
        type: Sequelize.STRING(50),
        unique: true,
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      market: {
        type: Sequelize.ENUM('spot', 'futures', 'margin', 'forex', 'stocks'),
        allowNull: false,
      },
      symbol: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      side: {
        type: Sequelize.ENUM('buy', 'sell'),
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: false,
      },
      quote_quantity: {
        type: Sequelize.DECIMAL(30, 18),
      },
      fee: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      fee_currency: {
        type: Sequelize.STRING(20),
      },
      fee_rate: {
        type: Sequelize.DECIMAL(10, 6),
      },
      is_maker: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      realized_pnl: {
        type: Sequelize.DECIMAL(30, 18),
      },
      commission: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      commission_asset: {
        type: Sequelize.STRING(20),
      },
      executed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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
    await queryInterface.addIndex('trades', ['user_id', 'created_at']);
    await queryInterface.addIndex('trades', ['order_id']);
    await queryInterface.addIndex('trades', ['trade_id']);
    await queryInterface.addIndex('trades', ['symbol']);
    await queryInterface.addIndex('trades', ['market']);
    await queryInterface.addIndex('trades', ['executed_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trades');
  }
};
