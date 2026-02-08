const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trade = sequelize.define('Trade', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tradeId: {
      type: DataTypes.STRING(50),
      unique: true,
      field: 'trade_id',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'order_id',
      references: {
        model: 'orders',
        key: 'id',
      },
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
    market: {
      type: DataTypes.ENUM('spot', 'futures', 'margin', 'forex', 'stocks'),
      allowNull: false,
    },
    symbol: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    side: {
      type: DataTypes.ENUM('buy', 'sell'),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(30, 18),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(30, 18),
      allowNull: false,
    },
    quoteQuantity: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'quote_quantity',
    },
    fee: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
    },
    feeCurrency: {
      type: DataTypes.STRING(20),
      field: 'fee_currency',
    },
    feeRate: {
      type: DataTypes.DECIMAL(10, 6),
      field: 'fee_rate',
    },
    isMaker: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_maker',
    },
    realizedPnl: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'realized_pnl',
    },
    commission: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
    },
    commissionAsset: {
      type: DataTypes.STRING(20),
      field: 'commission_asset',
    },
    executedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'executed_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'trades',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'created_at'] },
      { fields: ['order_id'] },
      { fields: ['trade_id'] },
      { fields: ['symbol'] },
      { fields: ['market'] },
      { fields: ['executed_at'] },
    ],
    hooks: {
      beforeSave: (trade) => {
        if (trade.price && trade.quantity) {
          trade.quoteQuantity = parseFloat(trade.price) * parseFloat(trade.quantity);
        }
      },
    },
  });

  return Trade;
};
