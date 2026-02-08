'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      transaction_id: {
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
      wallet_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'deposit', 'withdrawal', 'transfer_in', 'transfer_out',
          'trade_buy', 'trade_sell', 'fee', 'referral_bonus',
          'staking_reward', 'savings_interest', 'launchpad_purchase',
          'airdrop', 'adjustment'
        ),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: false,
      },
      fee: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      fee_currency: {
        type: Sequelize.STRING(20),
      },
      net_amount: {
        type: Sequelize.DECIMAL(30, 18),
      },
      balance_before: {
        type: Sequelize.DECIMAL(30, 18),
      },
      balance_after: {
        type: Sequelize.DECIMAL(30, 18),
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        defaultValue: 'pending',
      },
      network: {
        type: Sequelize.STRING(50),
      },
      address: {
        type: Sequelize.STRING(255),
      },
      tx_hash: {
        type: Sequelize.STRING(255),
      },
      confirmations: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      required_confirmations: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      from_wallet_id: {
        type: Sequelize.UUID,
      },
      to_wallet_id: {
        type: Sequelize.UUID,
      },
      order_id: {
        type: Sequelize.UUID,
      },
      trade_pair: {
        type: Sequelize.STRING(20),
      },
      price: {
        type: Sequelize.DECIMAL(30, 18),
      },
      quantity: {
        type: Sequelize.DECIMAL(30, 18),
      },
      related_transaction_id: {
        type: Sequelize.UUID,
      },
      description: {
        type: Sequelize.TEXT,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      ip: {
        type: Sequelize.STRING(45),
      },
      device: {
        type: Sequelize.STRING(255),
      },
      processed_at: {
        type: Sequelize.DATE,
      },
      completed_at: {
        type: Sequelize.DATE,
      },
      failed_at: {
        type: Sequelize.DATE,
      },
      cancelled_at: {
        type: Sequelize.DATE,
      },
      error_message: {
        type: Sequelize.TEXT,
      },
      error_code: {
        type: Sequelize.STRING(50),
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
    await queryInterface.addIndex('transactions', ['user_id', 'created_at']);
    await queryInterface.addIndex('transactions', ['wallet_id']);
    await queryInterface.addIndex('transactions', ['transaction_id']);
    await queryInterface.addIndex('transactions', ['type']);
    await queryInterface.addIndex('transactions', ['status']);
    await queryInterface.addIndex('transactions', ['tx_hash']);
    await queryInterface.addIndex('transactions', ['currency']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('transactions');
  }
};
