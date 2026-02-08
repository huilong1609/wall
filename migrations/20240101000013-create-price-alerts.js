'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('price_alerts', {
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
      symbol: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      condition: {
        type: Sequelize.ENUM('above', 'below', 'crosses'),
        allowNull: false,
      },
      target_price: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: false,
      },
      current_price: {
        type: Sequelize.DECIMAL(30, 18),
      },
      note: {
        type: Sequelize.TEXT,
      },
      channels: {
        type: Sequelize.JSONB,
        defaultValue: { email: true, push: true, sms: false },
      },
      recurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'triggered', 'expired', 'cancelled'),
        defaultValue: 'active',
      },
      triggered_at: {
        type: Sequelize.DATE,
      },
      trigger_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      expires_at: {
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
    await queryInterface.addIndex('price_alerts', ['user_id']);
    await queryInterface.addIndex('price_alerts', ['symbol']);
    await queryInterface.addIndex('price_alerts', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('price_alerts');
  }
};
