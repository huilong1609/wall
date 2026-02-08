'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staking_positions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      pool_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'staking_pools',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      asset: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: false,
      },
      locked_amount: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      rewards_earned: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      rewards_claimed: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      rewards_pending: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      apy: {
        type: Sequelize.DECIMAL(10, 4),
      },
      auto_compound: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'unstaking', 'completed', 'cancelled'),
        defaultValue: 'active',
      },
      staked_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      lock_ends_at: {
        type: Sequelize.DATE,
      },
      unstaked_at: {
        type: Sequelize.DATE,
      },
      last_reward_at: {
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
    await queryInterface.addIndex('staking_positions', ['user_id']);
    await queryInterface.addIndex('staking_positions', ['pool_id']);
    await queryInterface.addIndex('staking_positions', ['status']);
    await queryInterface.addIndex('staking_positions', ['asset']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('staking_positions');
  }
};
