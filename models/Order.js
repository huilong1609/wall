const { DataTypes } = require('sequelize');
const { generateOrderId } = require('../utils/helpers');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.STRING(50),
      unique: true,
      defaultValue: () => generateOrderId(),
      field: 'order_id',
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
    baseCurrency: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'base_currency',
    },
    quoteCurrency: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'quote_currency',
    },
    side: {
      type: DataTypes.ENUM('buy', 'sell'),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('market', 'limit', 'stop_limit', 'stop_market', 'trailing_stop', 'oco'),
      allowNull: false,
    },
    positionSide: {
      type: DataTypes.ENUM('long', 'short', 'both'),
      defaultValue: 'both',
      field: 'position_side',
    },
    price: {
      type: DataTypes.DECIMAL(30, 18),
    },
    stopPrice: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'stop_price',
    },
    trailingDelta: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'trailing_delta',
    },
    quantity: {
      type: DataTypes.DECIMAL(30, 18),
      allowNull: false,
    },
    filledQuantity: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'filled_quantity',
    },
    remainingQuantity: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'remaining_quantity',
    },
    quoteQuantity: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'quote_quantity',
    },
    avgPrice: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'avg_price',
    },
    totalValue: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'total_value',
    },
    leverage: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
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
    takeProfit: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'take_profit',
    },
    stopLoss: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'stop_loss',
    },
    timeInForce: {
      type: DataTypes.ENUM('GTC', 'IOC', 'FOK', 'GTD'),
      defaultValue: 'GTC',
      field: 'time_in_force',
    },
    expireTime: {
      type: DataTypes.DATE,
      field: 'expire_time',
    },
    status: {
      type: DataTypes.ENUM(
        'pending', 'open', 'partially_filled', 'filled',
        'cancelled', 'rejected', 'expired'
      ),
      defaultValue: 'pending',
    },
    reduceOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'reduce_only',
    },
    postOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'post_only',
    },
    clientOrderId: {
      type: DataTypes.STRING(100),
      field: 'client_order_id',
    },
    isCopyTrade: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_copy_trade',
    },
    masterOrderId: {
      type: DataTypes.UUID,
      field: 'master_order_id',
    },
    masterTraderId: {
      type: DataTypes.UUID,
      field: 'master_trader_id',
    },
    ip: {
      type: DataTypes.STRING(45),
    },
    device: {
      type: DataTypes.STRING(255),
    },
    openedAt: {
      type: DataTypes.DATE,
      field: 'opened_at',
    },
    filledAt: {
      type: DataTypes.DATE,
      field: 'filled_at',
    },
    cancelledAt: {
      type: DataTypes.DATE,
      field: 'cancelled_at',
    },
    rejectedAt: {
      type: DataTypes.DATE,
      field: 'rejected_at',
    },
    cancelReason: {
      type: DataTypes.TEXT,
      field: 'cancel_reason',
    },
    rejectReason: {
      type: DataTypes.TEXT,
      field: 'reject_reason',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'orders',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'created_at'] },
      { fields: ['order_id'] },
      { fields: ['symbol'] },
      { fields: ['status'] },
      { fields: ['market'] },
      { fields: ['user_id', 'status'] },
      { fields: ['client_order_id'] },
    ],
    hooks: {
      beforeSave: (order) => {
        order.remainingQuantity = parseFloat(order.quantity) - parseFloat(order.filledQuantity || 0);
        if (order.avgPrice && order.filledQuantity) {
          order.totalValue = parseFloat(order.avgPrice) * parseFloat(order.filledQuantity);
        }
      },
    },
  });

  // Instance Methods
  Order.prototype.open = async function () {
    this.status = 'open';
    this.openedAt = new Date();
    return this.save();
  };

  Order.prototype.cancel = async function (reason) {
    if (['filled', 'cancelled', 'rejected'].includes(this.status)) {
      throw new Error('Order cannot be cancelled');
    }
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelReason = reason;
    return this.save();
  };

  Order.prototype.reject = async function (reason) {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.rejectReason = reason;
    return this.save();
  };

  return Order;
};
