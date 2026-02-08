'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('api_keys', {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING(100),
        unique: true,
      },
      secret: {
        type: Sequelize.STRING(100),
      },
      secret_hash: {
        type: Sequelize.STRING(255),
      },
      permissions: {
        type: Sequelize.JSONB,
        defaultValue: {
          read: true,
          trade: false,
          withdraw: false,
        },
      },
      ip_restrictions: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'revoked'),
        defaultValue: 'active',
      },
      last_used_at: {
        type: Sequelize.DATE,
      },
      last_used_ip: {
        type: Sequelize.STRING(45),
      },
      expires_at: {
        type: Sequelize.DATE,
      },
      revoked_at: {
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
    await queryInterface.addIndex('api_keys', ['user_id']);
    await queryInterface.addIndex('api_keys', ['key']);
    await queryInterface.addIndex('api_keys', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('api_keys');
  }
};
