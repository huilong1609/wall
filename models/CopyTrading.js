const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Trader Profile (for traders who can be copied)
  const TraderProfile = sequelize.define('TraderProfile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    displayName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'display_name',
    },
    avatar: {
      type: DataTypes.STRING(500),
    },
    bio: {
      type: DataTypes.TEXT,
    },
    tradingStyle: {
      type: DataTypes.STRING(100),
      field: 'trading_style',
    },
    markets: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified',
    },
    badge: {
      type: DataTypes.ENUM('none', 'rising_star', 'consistent', 'pro', 'expert', 'elite'),
      defaultValue: 'none',
    },
    riskLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
      field: 'risk_level',
    },
    
    // Stats
    totalFollowers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_followers',
    },
    totalCopiers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_copiers',
    },
    totalTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_trades',
    },
    winRate: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      field: 'win_rate',
    },
    profit7d: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'profit_7d',
    },
    profit30d: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'profit_30d',
    },
    profit90d: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'profit_90d',
    },
    profitAll: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'profit_all',
    },
    maxDrawdown: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      field: 'max_drawdown',
    },
    avgTradeSize: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'avg_trade_size',
    },

    // Settings
    minCopyAmount: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 100,
      field: 'min_copy_amount',
    },
    performanceFee: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0.2,
      field: 'performance_fee',
    },
    acceptingCopiers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'accepting_copiers',
    },

    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'trader_profiles',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['badge'] },
      { fields: ['risk_level'] },
      { fields: ['profit_30d'] },
      { fields: ['total_copiers'] },
    ],
  });

  // Copy Trading Relationship
  const CopyRelation = sequelize.define('CopyRelation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    copierId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'copier_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    traderId: {
      type: DataTypes.UUID,
      field: 'trader_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    traderProfileId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'trader_profile_id',
      references: {
        model: 'trader_profiles',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('follow', 'copy'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'stopped'),
      defaultValue: 'active',
    },

    // Copy Settings
    copyAmount: {
      type: DataTypes.DECIMAL(20, 8),
      field: 'copy_amount',
    },
    copyMode: {
      type: DataTypes.ENUM('proportional', 'fixed'),
      defaultValue: 'proportional',
      field: 'copy_mode',
    },
    maxPerTrade: {
      type: DataTypes.DECIMAL(20, 8),
      field: 'max_per_trade',
    },
    stopLossPercent: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'stop_loss_percent',
    },
    takeProfitPercent: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'take_profit_percent',
    },
    notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    // Stats
    invested: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
    },
    currentValue: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'current_value',
    },
    totalProfit: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'total_profit',
    },
    profitPercent: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      field: 'profit_percent',
    },
    copiedTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'copied_trades',
    },
    winningTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'winning_trades',
    },
    losingTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'losing_trades',
    },

    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'started_at',
    },
    pausedAt: {
      type: DataTypes.DATE,
      field: 'paused_at',
    },
    stoppedAt: {
      type: DataTypes.DATE,
      field: 'stopped_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'copy_relations',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['copier_id'] },
      { fields: ['trader_id'] },
      { fields: ['trader_profile_id'] },
      { fields: ['status'] },
      { fields: ['type'] },
      { unique: true, fields: ['copier_id', 'trader_id', 'type'] },
    ],
  });

  return { TraderProfile, CopyRelation };
};
