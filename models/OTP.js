const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const OTP = sequelize.define('OTP', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.ENUM('email', 'sms', 'authenticator', 'push'),
      defaultValue: 'email',
    },
    identifier: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Email address or phone number where OTP was sent',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_used',
    },
    usedAt: {
      type: DataTypes.DATE,
      field: 'used_at',
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      field: 'max_attempts',
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_locked',
    },
    lockedAt: {
      type: DataTypes.DATE,
      field: 'locked_at',
    },
    ip: {
      type: DataTypes.STRING(45),
    },
    device: {
      type: DataTypes.STRING(255),
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'otps',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['code'] },
      { fields: ['type'] },
      { fields: ['identifier'] },
      { fields: ['expires_at'] },
      { fields: ['is_used'] },
      { fields: ['user_id', 'type', 'is_used'] },
    ],
  });

  // Instance Methods
  OTP.prototype.isExpired = function () {
    return new Date() > this.expiresAt;
  };

  OTP.prototype.isValid = function () {
    return !this.isUsed && !this.isExpired() && !this.isLocked;
  };

  OTP.prototype.verify = async function (code) {
    // Check if OTP is locked
    if (this.isLocked) {
      throw new Error('OTP is locked due to too many attempts');
    }

    // Check if already used
    if (this.isUsed) {
      throw new Error('OTP has already been used');
    }

    // Check if expired
    if (this.isExpired()) {
      throw new Error('OTP has expired');
    }

    // Increment attempts
    this.attempts += 1;

    // Check if code matches
    if (this.code !== code) {
      // Lock if max attempts reached
      if (this.attempts >= this.maxAttempts) {
        this.isLocked = true;
        this.lockedAt = new Date();
      }
      await this.save();
      throw new Error('Invalid OTP code');
    }

    // Mark as used
    this.isUsed = true;
    this.usedAt = new Date();
    await this.save();

    return true;
  };

  OTP.prototype.markAsUsed = async function () {
    this.isUsed = true;
    this.usedAt = new Date();
    return this.save();
  };

  OTP.prototype.incrementAttempts = async function () {
    this.attempts += 1;
    if (this.attempts >= this.maxAttempts) {
      this.isLocked = true;
      this.lockedAt = new Date();
    }
    return this.save();
  };

  // Class Methods
  OTP.generateCode = function (length = 6) {
    const digits = '0123456789';
    let code = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      code += digits[randomBytes[i] % digits.length];
    }
    
    return code;
  };

  OTP.create = async function (data) {
    const {
      userId,
      type,
      channel = 'email',
      identifier,
      expiryMinutes = 10,
      length = 6,
      ip,
      device,
      metadata = {},
    } = data;

    // Generate OTP code
    const code = this.generateCode(length);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Create OTP record
    const otp = await sequelize.models.OTP.create({
      userId,
      code,
      type,
      channel,
      identifier,
      expiresAt,
      ip,
      device,
      metadata,
    });

    return otp;
  };

  OTP.findValidOTP = async function (userId, type, code) {
    const otp = await this.findOne({
      where: {
        userId,
        type,
        code,
        isUsed: false,
        isLocked: false,
      },
      order: [['created_at', 'DESC']],
    });

    if (!otp) {
      return null;
    }

    if (otp.isExpired()) {
      return null;
    }

    return otp;
  };

  OTP.verifyCode = async function (userId, type, code) {
    const otp = await this.findValidOTP(userId, type, code);
    
    if (!otp) {
      throw new Error('Invalid or expired OTP');
    }

    return otp.verify(code);
  };

  OTP.invalidatePreviousOTPs = async function (userId, type) {
    return this.update(
      { isUsed: true, usedAt: new Date() },
      {
        where: {
          userId,
          type,
          isUsed: false,
        },
      }
    );
  };

  OTP.cleanupExpired = async function () {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    return this.destroy({
      where: {
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: cutoffDate,
        },
      },
    });
  };

  OTP.getActiveOTP = async function (userId, type) {
    return this.findOne({
      where: {
        userId,
        type,
        isUsed: false,
        isLocked: false,
      },
      order: [['created_at', 'DESC']],
    });
  };

  OTP.hasActiveOTP = async function (userId, type) {
    const otp = await this.getActiveOTP(userId, type);
    return otp && otp.isValid();
  };

  return OTP;
};
