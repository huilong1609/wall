'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      ticket_id: {
        type: Sequelize.STRING(20),
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
      category: {
        type: Sequelize.ENUM(
          'account', 'trading', 'deposits', 'withdrawals',
          'verification', 'security', 'technical', 'other'
        ),
        allowNull: false,
      },
      subcategory: {
        type: Sequelize.STRING(100),
      },
      subject: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
      },
      status: {
        type: Sequelize.ENUM('open', 'pending', 'in_progress', 'resolved', 'closed'),
        defaultValue: 'open',
      },
      assigned_to: {
        type: Sequelize.UUID,
      },
      order_id: {
        type: Sequelize.STRING(50),
      },
      transaction_id: {
        type: Sequelize.STRING(50),
      },
      attachments: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      last_reply_by: {
        type: Sequelize.ENUM('user', 'support'),
      },
      last_reply_at: {
        type: Sequelize.DATE,
      },
      resolved_at: {
        type: Sequelize.DATE,
      },
      closed_at: {
        type: Sequelize.DATE,
      },
      rating: {
        type: Sequelize.INTEGER,
      },
      rating_comment: {
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
    await queryInterface.addIndex('tickets', ['user_id']);
    await queryInterface.addIndex('tickets', ['ticket_id']);
    await queryInterface.addIndex('tickets', ['status']);
    await queryInterface.addIndex('tickets', ['category']);
    await queryInterface.addIndex('tickets', ['priority']);
    await queryInterface.addIndex('tickets', ['assigned_to']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tickets');
  }
};
