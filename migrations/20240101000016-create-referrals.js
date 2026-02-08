'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('referrals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      referrer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      referred_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'inactive'),
        defaultValue: 'pending',
      },
      total_earnings: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      total_trading_volume: {
        type: Sequelize.DECIMAL(30, 8),
        defaultValue: 0,
      },
      commission_rate: {
        type: Sequelize.DECIMAL(10, 4),
      },
      activated_at: {
        type: Sequelize.DATE,
      },
      last_earning_at: {
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
    await queryInterface.addIndex('referrals', ['referrer_id']);
    await queryInterface.addIndex('referrals', ['referred_id']);
    await queryInterface.addIndex('referrals', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('referrals');
  }
};
