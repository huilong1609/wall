'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      
      // Basic Info
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      username: {
        type: Sequelize.STRING(30),
        unique: true,
        allowNull: true,
      },
      first_name: {
        type: Sequelize.STRING(50),
      },
      last_name: {
        type: Sequelize.STRING(50),
      },
      phone: {
        type: Sequelize.STRING(20),
      },
      avatar: {
        type: Sequelize.STRING(500),
      },
      bio: {
        type: Sequelize.TEXT,
      },

      // Location & Preferences
      country: {
        type: Sequelize.STRING(100),
      },
      city: {
        type: Sequelize.STRING(100),
      },
      timezone: {
        type: Sequelize.STRING(50),
        defaultValue: 'UTC',
      },
      language: {
        type: Sequelize.STRING(10),
        defaultValue: 'en',
      },
      currency: {
        type: Sequelize.STRING(10),
        defaultValue: 'USD',
      },
      date_format: {
        type: Sequelize.STRING(20),
        defaultValue: 'MM/DD/YYYY',
      },

      // Account Status
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended', 'pending'),
        defaultValue: 'pending',
      },
      role: {
        type: Sequelize.ENUM('user', 'trader', 'admin', 'superadmin'),
        defaultValue: 'user',
      },
      account_type: {
        type: Sequelize.ENUM('basic', 'premium', 'vip'),
        defaultValue: 'basic',
      },

      // Verification
      email_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      email_verification_token: {
        type: Sequelize.STRING(255),
      },
      email_verification_expires: {
        type: Sequelize.DATE,
      },
      phone_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      phone_verification_code: {
        type: Sequelize.STRING(10),
      },
      phone_verification_expires: {
        type: Sequelize.DATE,
      },

      // KYC Verification
      kyc_status: {
        type: Sequelize.ENUM('none', 'pending', 'level1', 'level2', 'level3', 'level4', 'rejected'),
        defaultValue: 'none',
      },

      // Security
      two_factor_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      two_factor_secret: {
        type: Sequelize.STRING(255),
      },
      two_factor_method: {
        type: Sequelize.ENUM('authenticator', 'sms', 'email'),
        defaultValue: 'authenticator',
      },
      backup_codes: {
        type: Sequelize.ARRAY(Sequelize.STRING),
      },
      anti_phishing_code: {
        type: Sequelize.STRING(50),
      },
      withdrawal_whitelist: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      login_notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },

      // Password Reset
      password_reset_token: {
        type: Sequelize.STRING(255),
      },
      password_reset_expires: {
        type: Sequelize.DATE,
      },
      password_changed_at: {
        type: Sequelize.DATE,
      },

      // Login Tracking
      last_login: {
        type: Sequelize.DATE,
      },
      last_login_ip: {
        type: Sequelize.STRING(45),
      },
      last_login_device: {
        type: Sequelize.STRING(255),
      },
      login_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      lock_until: {
        type: Sequelize.DATE,
      },

      // Referral
      referral_code: {
        type: Sequelize.STRING(20),
        unique: true,
      },
      referred_by_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      referral_tier: {
        type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
        defaultValue: 'bronze',
      },
      referral_earnings: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },

      // Trading
      trading_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      margin_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      futures_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      // Notification Preferences
      notification_preferences: {
        type: Sequelize.JSONB,
        defaultValue: {
          email: {
            orderFilled: true,
            orderCancelled: true,
            priceAlerts: true,
            depositReceived: true,
            withdrawalCompleted: true,
            securityAlerts: true,
            newsletter: false,
            promotions: false,
          },
          push: {
            orderFilled: true,
            orderCancelled: true,
            priceAlerts: true,
            depositReceived: true,
            withdrawalCompleted: true,
            securityAlerts: true,
          },
          sms: {
            securityAlerts: true,
            withdrawalCompleted: false,
          },
        },
      },

      // Quiet Hours
      quiet_hours: {
        type: Sequelize.JSONB,
        defaultValue: {
          enabled: false,
          start: '22:00',
          end: '07:00',
        },
      },

      // Metadata
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
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['username']);
    await queryInterface.addIndex('users', ['referral_code']);
    await queryInterface.addIndex('users', ['status']);
    await queryInterface.addIndex('users', ['referred_by_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};
