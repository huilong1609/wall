const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const EmailOTP = sequelize.define('EmailOTP', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(225),
      allowNull: false,
      comment: 'Email address where OTP was sent',
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    identifier: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Same as email for email OTPs',
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
    tableName: 'email_otps',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['code'] },
      { fields: ['identifier'] },
      { fields: ['expires_at'] },
      { fields: ['is_used'] },
    ],
  });

  // ---------------------
  // Instance Methods
  // ---------------------
  EmailOTP.prototype.isExpired = function () {
    return new Date() > this.expiresAt;
  };

  EmailOTP.prototype.isValid = function () {
    return !this.isUsed && !this.isExpired();
  };

  EmailOTP.prototype.verify = async function (code) {
    if (this.isUsed) throw new Error('OTP already used');
    if (this.isExpired()) throw new Error('OTP expired');

    this.attempts += 1;

    if (this.code !== code) {
      if (this.attempts >= this.maxAttempts) {
        this.isUsed = true;
        this.usedAt = new Date();
      }
      await this.save();
      throw new Error('Invalid OTP code');
    }

    this.isUsed = true;
    this.usedAt = new Date();
    await this.save();
    return true;
  };

  // ---------------------
  // Class Methods
  // ---------------------
  EmailOTP.generateCode = function (length = 6) {
    const digits = '0123456789';
    let code = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      code += digits[randomBytes[i] % digits.length];
    }

    return code;
  };

  EmailOTP.createOTP = async function (data) {
    const {
      email,
      expiryMinutes = 10,
      length = 6,
      ip = null,
      device = null,
      metadata = {},
    } = data;

    const code = this.generateCode(length);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    return this.create({
      email,
      identifier: email,
      code,
      expiresAt,
      ip,
      device,
      metadata,
    });
  };

  EmailOTP.findValidOTP = async function (email, code) {
    const otp = await this.findOne({
      where: {
        email,
        code,
        isUsed: false,
      },
      order: [['created_at', 'DESC']],
    });

    if (!otp || otp.isExpired()) return null;

    return otp;
  };

  EmailOTP.invalidatePreviousOTPs = async function (email) {
    return this.update(
      { isUsed: true, usedAt: new Date() },
      {
        where: { email, isUsed: false },
      }
    );
  };

  EmailOTP.cleanupExpired = async function () {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h
    return this.destroy({
      where: {
        expiresAt: { [sequelize.Sequelize.Op.lt]: cutoff },
      },
    });
  };

  return EmailOTP;
};
