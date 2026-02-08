const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TradingPair = sequelize.define('TradingPair', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    symbol: {
      type: DataTypes.STRING(20), // ✅ matches DB: varchar(20)
      unique: true,
      allowNull: false,
    },

    baseAsset: {
      type: DataTypes.STRING(20), // ✅ matches DB: varchar(20)
      allowNull: false,
      field: 'base_asset',
    },

    quoteAsset: {
      type: DataTypes.STRING(20), // ✅ matches DB: varchar(20)
      allowNull: false,
      field: 'quote_asset',
    },

    market: {
      // ✅ matches DB enum: ('spot','futures','margin','forex','stocks','crypto','etf')
      type: DataTypes.ENUM('spot', 'futures', 'margin', 'forex', 'stocks', 'crypto', 'etf'),
      allowNull: false,
    },

    // Price Info
    price: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
    },
    bidPrice: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'bid_price',
    },
    askPrice: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'ask_price',
    },
    priceChange24h: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'price_change_24h',
    },
    priceChangePercent24h: {
      type: DataTypes.DECIMAL(10, 4),
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
    quoteVolume24h: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'quote_volume_24h',
    },

    // Trading Rules
    minQuantity: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'min_quantity',
    },
    maxQuantity: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'max_quantity',
    },
    stepSize: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0.00000001,
      field: 'step_size',
    },
    minNotional: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 10,
      field: 'min_notional',
    },
    tickSize: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0.01,
      field: 'tick_size',
    },
    pricePrecision: {
      type: DataTypes.INTEGER,
      defaultValue: 8,
      field: 'price_precision',
    },
    quantityPrecision: {
      type: DataTypes.INTEGER,
      defaultValue: 8,
      field: 'quantity_precision',
    },

    // Fees
    makerFee: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0.001,
      field: 'maker_fee',
    },
    takerFee: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0.001,
      field: 'taker_fee',
    },

    // Futures specific
    maxLeverage: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'max_leverage',
    },
    maintenanceMarginRate: {
      type: DataTypes.DECIMAL(10, 6),
      field: 'maintenance_margin_rate',
    },

    // Status
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'halt'),
      defaultValue: 'active',
    },
    tradingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'trading_enabled',
    },

    // Popularity
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_featured',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
    },

    priceUpdatedAt: {
      type: DataTypes.DATE,
      field: 'price_updated_at',
    },

    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    // ✅ These exist in your DB table
    name: {
      type: DataTypes.STRING(150),
      allowNull: true, // DB does NOT say NOT NULL
    },
    tradeView: {
      type: DataTypes.STRING(100),
      allowNull: true, // DB does NOT say NOT NULL
      field: 'trade_view',
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true, // DB does NOT say NOT NULL
    },
  }, {
    tableName: 'trading_pairs',
    timestamps: true,         // maps to created_at, updated_at
    underscored: true,        // created_at / updated_at
    createdAt: 'created_at',  // ✅ ensure exact DB columns
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['symbol'] },
      { fields: ['base_asset'] },
      { fields: ['quote_asset'] },
      { fields: ['market'] },
      { fields: ['status'] },
      { fields: ['is_featured'] },
    ],
  });

  return TradingPair;
};
