'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      order_id: {
        type: Sequelize.STRING(50),
        unique: true,
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
      base_currency: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      quote_currency: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      side: {
        type: Sequelize.ENUM('buy', 'sell'),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('market', 'limit', 'stop_limit', 'stop_market', 'trailing_stop', 'oco'),
        allowNull: false,
      },
      position_side: {
        type: Sequelize.ENUM('long', 'short', 'both'),
        defaultValue: 'both',
      },
      price: {
        type: Sequelize.DECIMAL(30, 18),
      },
      stop_price: {
        type: Sequelize.DECIMAL(30, 18),
      },
      trailing_delta: {
        type: Sequelize.DECIMAL(10, 4),
      },
      quantity: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: false,
      },
      filled_quantity: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      remaining_quantity: {
        type: Sequelize.DECIMAL(30, 18),
      },
      quote_quantity: {
        type: Sequelize.DECIMAL(30, 18),
      },
      avg_price: {
        type: Sequelize.DECIMAL(30, 18),
      },
      total_value: {
        type: Sequelize.DECIMAL(30, 18),
      },
      leverage: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
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
      take_profit: {
        type: Sequelize.DECIMAL(30, 18),
      },
      stop_loss: {
        type: Sequelize.DECIMAL(30, 18),
      },
      time_in_force: {
        type: Sequelize.ENUM('GTC', 'IOC', 'FOK', 'GTD'),
        defaultValue: 'GTC',
      },
      expire_time: {
        type: Sequelize.DATE,
      },
      status: {
        type: Sequelize.ENUM(
          'pending', 'open', 'partially_filled', 'filled',
          'cancelled', 'rejected', 'expired'
        ),
        defaultValue: 'pending',
      },
      reduce_only: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      post_only: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      client_order_id: {
        type: Sequelize.STRING(100),
      },
      is_copy_trade: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      master_order_id: {
        type: Sequelize.UUID,
      },
      master_trader_id: {
        type: Sequelize.UUID,
      },
      ip: {
        type: Sequelize.STRING(45),
      },
      device: {
        type: Sequelize.STRING(255),
      },
      opened_at: {
        type: Sequelize.DATE,
      },
      filled_at: {
        type: Sequelize.DATE,
      },
      cancelled_at: {
        type: Sequelize.DATE,
      },
      rejected_at: {
        type: Sequelize.DATE,
      },
      cancel_reason: {
        type: Sequelize.TEXT,
      },
      reject_reason: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('orders', ['user_id', 'created_at']);
    await queryInterface.addIndex('orders', ['order_id']);
    await queryInterface.addIndex('orders', ['symbol']);
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('orders', ['market']);
    await queryInterface.addIndex('orders', ['user_id', 'status']);
    await queryInterface.addIndex('orders', ['client_order_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('orders');
  }
};
