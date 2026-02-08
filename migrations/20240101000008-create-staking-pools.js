'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staking_pools', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      asset: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('flexible', 'locked'),
        allowNull: false,
      },
      apy: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false,
      },
      min_stake: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      max_stake: {
        type: Sequelize.DECIMAL(30, 18),
      },
      lock_period_days: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_staked: {
        type: Sequelize.DECIMAL(30, 18),
        defaultValue: 0,
      },
      total_capacity: {
        type: Sequelize.DECIMAL(30, 18),
      },
      participants: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      reward_distribution: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'end'),
        defaultValue: 'daily',
      },
      auto_compound: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      early_unstake_penalty: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'ended'),
        defaultValue: 'active',
      },
      start_date: {
        type: Sequelize.DATE,
      },
      end_date: {
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
    await queryInterface.addIndex('staking_pools', ['asset']);
    await queryInterface.addIndex('staking_pools', ['type']);
    await queryInterface.addIndex('staking_pools', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('staking_pools');
  }
};
