const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Referral = sequelize.define('Referral', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    referrerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'referrer_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    referredId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'referred_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'inactive'),
      defaultValue: 'pending',
    },
    totalEarnings: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'total_earnings',
    },
    totalTradingVolume: {
      type: DataTypes.DECIMAL(30, 8),
      defaultValue: 0,
      field: 'total_trading_volume',
    },
    commissionRate: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'commission_rate',
    },
    activatedAt: {
      type: DataTypes.DATE,
      field: 'activated_at',
    },
    lastEarningAt: {
      type: DataTypes.DATE,
      field: 'last_earning_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'referrals',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['referrer_id'] },
      { fields: ['referred_id'] },
      { fields: ['status'] },
    ],
  });

  // Referral Earnings
  const ReferralEarning = sequelize.define('ReferralEarning', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    referralId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'referral_id',
      references: {
        model: 'referrals',
        key: 'id',
      },
    },
    referrerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'referrer_id',
    },
    referredId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'referred_id',
    },
    type: {
      type: DataTypes.ENUM('trading_fee', 'bonus', 'tier_bonus'),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    tradingVolume: {
      type: DataTypes.DECIMAL(30, 8),
      field: 'trading_volume',
    },
    commissionRate: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'commission_rate',
    },
    tradeId: {
      type: DataTypes.UUID,
      field: 'trade_id',
    },
    status: {
      type: DataTypes.ENUM('pending', 'credited', 'cancelled'),
      defaultValue: 'pending',
    },
    creditedAt: {
      type: DataTypes.DATE,
      field: 'credited_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'referral_earnings',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['referral_id'] },
      { fields: ['referrer_id'] },
      { fields: ['referred_id'] },
      { fields: ['status'] },
      { fields: ['type'] },
    ],
  });

  return { Referral, ReferralEarning };
};
