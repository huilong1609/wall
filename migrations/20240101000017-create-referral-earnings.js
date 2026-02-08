'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('referral_earnings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      referral_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'referrals',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      referrer_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      referred_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('trading_fee', 'bonus', 'tier_bonus'),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
      },
      trading_volume: {
        type: Sequelize.DECIMAL(30, 8),
      },
      commission_rate: {
        type: Sequelize.DECIMAL(10, 4),
      },
      trade_id: {
        type: Sequelize.UUID,
      },
      status: {
        type: Sequelize.ENUM('pending', 'credited', 'cancelled'),
        defaultValue: 'pending',
      },
      credited_at: {
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
    await queryInterface.addIndex('referral_earnings', ['referral_id']);
    await queryInterface.addIndex('referral_earnings', ['referrer_id']);
    await queryInterface.addIndex('referral_earnings', ['referred_id']);
    await queryInterface.addIndex('referral_earnings', ['status']);
    await queryInterface.addIndex('referral_earnings', ['type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('referral_earnings');
  }
};
