const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Asset = sequelize.define('Asset', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    symbol: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('crypto', 'fiat', 'stock', 'forex', 'commodity'),
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING(500),
    },
    decimals: {
      type: DataTypes.INTEGER,
      defaultValue: 8,
    },
    
    // Market Data
    price: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
    },
    priceChange24h: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'price_change_24h',
    },
    priceChangePercent24h: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      field: 'price_change_percent_24h',
    },
    high24h: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'high_24h',
    },
    low24h: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'low_24h',
    },
    volume24h: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'volume_24h',
    },
    marketCap: {
      type: DataTypes.DECIMAL(30, 2),
      field: 'market_cap',
    },
    circulatingSupply: {
      type: DataTypes.DECIMAL(30, 8),
      field: 'circulating_supply',
    },
    totalSupply: {
      type: DataTypes.DECIMAL(30, 8),
      field: 'total_supply',
    },
    maxSupply: {
      type: DataTypes.DECIMAL(30, 8),
      field: 'max_supply',
    },
    rank: {
      type: DataTypes.INTEGER,
    },

    // Network Info
    networks: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    // Deposit/Withdrawal Settings
    depositEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'deposit_enabled',
    },
    withdrawalEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'withdrawal_enabled',
    },
    minDeposit: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'min_deposit',
    },
    minWithdrawal: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'min_withdrawal',
    },
    withdrawalFee: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'withdrawal_fee',
    },
    confirmations: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    // Trading Settings
    tradingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'trading_enabled',
    },
    
    // Status
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'delisting'),
      defaultValue: 'active',
    },

    // External IDs
    coingeckoId: {
      type: DataTypes.STRING(100),
      field: 'coingecko_id',
    },

    // Last Updated
    priceUpdatedAt: {
      type: DataTypes.DATE,
      field: 'price_updated_at',
    },

    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'assets',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['symbol'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['rank'] },
    ],
  });

  return Asset;
};
