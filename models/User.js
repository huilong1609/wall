const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const config = require('../config');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    // Basic Info
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    pin: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(30),
      unique: true,
      allowNull: true,
      validate: {
        len: [3, 30],
      },
    },
    firstName: {
      type: DataTypes.STRING(50),
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(50),
      field: 'last_name',
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    avatar: {
      type: DataTypes.STRING(500),
    },
    bio: {
      type: DataTypes.TEXT,
    },

    // Location & Preferences
    country: {
      type: DataTypes.STRING(100),
    },
    city: {
      type: DataTypes.STRING(100),
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'UTC',
    },
    language: {
      type: DataTypes.STRING(10),
      defaultValue: 'en',
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'USD',
    },
    dateFormat: {
      type: DataTypes.STRING(20),
      defaultValue: 'MM/DD/YYYY',
      field: 'date_format',
    },

    // Account Status
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
      defaultValue: 'pending',
    },
    role: {
      type: DataTypes.ENUM('user', 'trader', 'admin', 'superadmin'),
      defaultValue: 'user',
    },
    accountType: {
      type: DataTypes.ENUM('basic', 'premium', 'vip'),
      defaultValue: 'basic',
      field: 'account_type',
    },

    // Verification
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'email_verified',
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      field: 'email_verification_token',
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      field: 'email_verification_expires',
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'phone_verified',
    },
    phoneVerificationCode: {
      type: DataTypes.STRING(10),
      field: 'phone_verification_code',
    },
    phoneVerificationExpires: {
      type: DataTypes.DATE,
      field: 'phone_verification_expires',
    },

    // KYC Verification
    kycStatus: {
      type: DataTypes.ENUM('none', 'pending', 'level1', 'level2', 'level3', 'level4', 'rejected'),
      defaultValue: 'none',
      field: 'kyc_status',
    },

    // Security
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'two_factor_enabled',
    },
    twoFactorSecret: {
      type: DataTypes.STRING(255),
      field: 'two_factor_secret',
    },
    twoFactorMethod: {
      type: DataTypes.ENUM('authenticator', 'sms', 'email'),
      defaultValue: 'authenticator',
      field: 'two_factor_method',
    },
    backupCodes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      field: 'backup_codes',
    },
    antiPhishingCode: {
      type: DataTypes.STRING(50),
      field: 'anti_phishing_code',
    },
    withdrawalWhitelist: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'withdrawal_whitelist',
    },
    loginNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'login_notifications',
    },

    // Password Reset
    passwordResetToken: {
      type: DataTypes.STRING(255),
      field: 'password_reset_token',
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      field: 'password_reset_expires',
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      field: 'password_changed_at',
    },

    // Login Tracking
    lastLogin: {
      type: DataTypes.DATE,
      field: 'last_login',
    },
    lastLoginIp: {
      type: DataTypes.STRING(45),
      field: 'last_login_ip',
    },
    lastLoginDevice: {
      type: DataTypes.STRING(255),
      field: 'last_login_device',
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'login_attempts',
    },
    lockUntil: {
      type: DataTypes.DATE,
      field: 'lock_until',
    },

    // Referral
    referralCode: {
      type: DataTypes.STRING(20),
      unique: true,
      field: 'referral_code',
    },
    referredById: {
      type: DataTypes.UUID,
      field: 'referred_by_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    referralTier: {
      type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
      defaultValue: 'bronze',
      field: 'referral_tier',
    },
    referralEarnings: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'referral_earnings',
    },

    // Trading
    tradingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'trading_enabled',
    },
    marginEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'margin_enabled',
    },
    futuresEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'futures_enabled',
    },

    // Notification Preferences (JSONB for flexibility)
    notificationPreferences: {
      type: DataTypes.JSONB,
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
      field: 'notification_preferences',
    },

    // Quiet Hours
    quietHours: {
      type: DataTypes.JSONB,
      defaultValue: {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
      field: 'quiet_hours',
    },

    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['username'] },
      { fields: ['referral_code'] },
      { fields: ['status'] },
      { fields: ['referred_by_id'] },
    ],
  });

  // Hooks
  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, config.bcryptSaltRounds);
    }
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, config.bcryptSaltRounds);
      user.passwordChangedAt = new Date();
    }
  });

  // Instance Methods
  User.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.changedPasswordAfter = function (jwtTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
      return jwtTimestamp < changedTimestamp;
    }
    return false;
  };

  User.prototype.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > new Date());
  };

  User.prototype.incrementLoginAttempts = async function () {
    if (this.lockUntil && this.lockUntil < new Date()) {
      await this.update({ loginAttempts: 1, lockUntil: null });
      return;
    }

    const updates = { loginAttempts: this.loginAttempts + 1 };
    if (this.loginAttempts + 1 >= 5) {
      updates.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }
    await this.update(updates);
  };

  User.prototype.getVerificationLimits = function () {
    const limits = config.verificationLimits;
    switch (this.kycStatus) {
      case 'level4': return limits.level4;
      case 'level3': return limits.level3;
      case 'level2': return limits.level2;
      case 'level1': return limits.level1;
      default: return { daily: 0, monthly: 0 };
    }
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.twoFactorSecret;
    delete values.backupCodes;
    delete values.emailVerificationToken;
    delete values.passwordResetToken;
    return values;
  };

  // Class Methods
  User.findByCredentials = async function (email, password) {
    const user = await this.findOne({ where: { email } });
    if (!user) return null;

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return null;

    return user;
  };

  return User;
};
