'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('otps', {
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
      code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(
          'email_verification',
          'phone_verification',
          '2fa',
          'password_reset',
          'withdrawal',
          'login',
          'transaction',
          'api_key',
          'security_change'
        ),
        allowNull: false,
      },
      channel: {
        type: Sequelize.ENUM('email', 'sms', 'authenticator', 'push'),
        defaultValue: 'email',
      },
      identifier: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email address or phone number where OTP was sent',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      is_used: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      used_at: {
        type: Sequelize.DATE,
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
      },
      is_locked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      locked_at: {
        type: Sequelize.DATE,
      },
      ip: {
        type: Sequelize.STRING(45),
      },
      device: {
        type: Sequelize.STRING(255),
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
    await queryInterface.addIndex('otps', ['user_id']);
    await queryInterface.addIndex('otps', ['code']);
    await queryInterface.addIndex('otps', ['type']);
    await queryInterface.addIndex('otps', ['identifier']);
    await queryInterface.addIndex('otps', ['expires_at']);
    await queryInterface.addIndex('otps', ['is_used']);
    await queryInterface.addIndex('otps', ['user_id', 'type', 'is_used']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('otps');
  }
};
