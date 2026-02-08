const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PriceAlert = sequelize.define('PriceAlert', {
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
    symbol: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    condition: {
      type: DataTypes.ENUM('above', 'below', 'crosses'),
      allowNull: false,
    },
    targetPrice: {
      type: DataTypes.DECIMAL(30, 18),
      allowNull: false,
      field: 'target_price',
    },
    currentPrice: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'current_price',
    },
    note: {
      type: DataTypes.TEXT,
    },
    channels: {
      type: DataTypes.JSONB,
      defaultValue: { email: true, push: true, sms: false },
    },
    recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'triggered', 'expired', 'cancelled'),
      defaultValue: 'active',
    },
    triggeredAt: {
      type: DataTypes.DATE,
      field: 'triggered_at',
    },
    triggerCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'trigger_count',
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'price_alerts',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['symbol'] },
      { fields: ['status'] },
    ],
  });

  // Instance Methods
  PriceAlert.prototype.trigger = async function (price) {
    this.status = this.recurring ? 'active' : 'triggered';
    this.triggeredAt = new Date();
    this.triggerCount += 1;
    this.currentPrice = price;
    return this.save();
  };

  return PriceAlert;
};
