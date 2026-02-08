'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('copy_relations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      copier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trader_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trader_profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trader_profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('follow', 'copy'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'stopped'),
        defaultValue: 'active',
      },

      // Copy Settings
      copy_amount: {
        type: Sequelize.DECIMAL(20, 8),
      },
      copy_mode: {
        type: Sequelize.ENUM('proportional', 'fixed'),
        defaultValue: 'proportional',
      },
      max_per_trade: {
        type: Sequelize.DECIMAL(20, 8),
      },
      stop_loss_percent: {
        type: Sequelize.DECIMAL(10, 4),
      },
      take_profit_percent: {
        type: Sequelize.DECIMAL(10, 4),
      },
      notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },

      // Stats
      invested: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      current_value: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      total_profit: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      profit_percent: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
      },
      copied_trades: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      winning_trades: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      losing_trades: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },

      started_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      paused_at: {
        type: Sequelize.DATE,
      },
      stopped_at: {
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
    await queryInterface.addIndex('copy_relations', ['copier_id']);
    await queryInterface.addIndex('copy_relations', ['trader_id']);
    await queryInterface.addIndex('copy_relations', ['trader_profile_id']);
    await queryInterface.addIndex('copy_relations', ['status']);
    await queryInterface.addIndex('copy_relations', ['type']);
    await queryInterface.addIndex('copy_relations', ['copier_id', 'trader_id', 'type'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('copy_relations');
  }
};
