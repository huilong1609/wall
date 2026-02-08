const { DataTypes } = require('sequelize');
const { generateApiKey, generateApiSecret } = require('../utils/helpers');

// Session Model
module.exports.SessionModel = (sequelize) => {
  const Session = sequelize.define('Session', {
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
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    refreshToken: {
      type: DataTypes.STRING(500),
      field: 'refresh_token',
    },
    device: {
      type: DataTypes.STRING(255),
    },
    browser: {
      type: DataTypes.STRING(100),
    },
    os: {
      type: DataTypes.STRING(100),
    },
    ip: {
      type: DataTypes.STRING(45),
    },
    location: {
      type: DataTypes.STRING(255),
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'last_active_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at',
    },
    revokedAt: {
      type: DataTypes.DATE,
      field: 'revoked_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'sessions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token'] },
      { fields: ['is_active'] },
    ],
  });

  // Instance Methods
  Session.prototype.revoke = async function () {
    this.isActive = false;
    this.revokedAt = new Date();
    return this.save();
  };

  Session.prototype.updateActivity = async function () {
    this.lastActiveAt = new Date();
    return this.save();
  };

  return Session;
};

// API Key Model
module.exports.ApiKeyModel = (sequelize) => {
  const ApiKey = sequelize.define('ApiKey', {
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING(100),
      unique: true,
      defaultValue: () => generateApiKey(),
    },
    secret: {
      type: DataTypes.STRING(100),
      defaultValue: () => generateApiSecret(),
    },
    secretHash: {
      type: DataTypes.STRING(255),
      field: 'secret_hash',
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {
        read: true,
        trade: false,
        withdraw: false,
      },
    },
    ipRestrictions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      field: 'ip_restrictions',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'revoked'),
      defaultValue: 'active',
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      field: 'last_used_at',
    },
    lastUsedIp: {
      type: DataTypes.STRING(45),
      field: 'last_used_ip',
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at',
    },
    revokedAt: {
      type: DataTypes.DATE,
      field: 'revoked_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'api_keys',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['key'] },
      { fields: ['status'] },
    ],
  });

  // Instance Methods
  ApiKey.prototype.revoke = async function () {
    this.status = 'revoked';
    this.revokedAt = new Date();
    return this.save();
  };

  ApiKey.prototype.updateUsage = async function (ip) {
    this.lastUsedAt = new Date();
    this.lastUsedIp = ip;
    return this.save();
  };

  ApiKey.prototype.hasPermission = function (permission) {
    return this.permissions && this.permissions[permission] === true;
  };

  ApiKey.prototype.isIpAllowed = function (ip) {
    if (!this.ipRestrictions || this.ipRestrictions.length === 0) {
      return true;
    }
    return this.ipRestrictions.includes(ip);
  };

  return ApiKey;
};
