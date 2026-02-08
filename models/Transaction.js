const { DataTypes } = require('sequelize');
const { generateTransactionId } = require('../utils/helpers');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    transactionId: {
      type: DataTypes.STRING(50),
      unique: true,
      defaultValue: () => generateTransactionId(),
      field: 'transaction_id',
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
    walletId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'wallet_id',
      references: {
        model: 'wallets',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM(
        'deposit', 'withdrawal', 'transfer_in', 'transfer_out',
        'trade_buy', 'trade_sell', 'fee', 'referral_bonus',
        'staking_reward', 'savings_interest', 'launchpad_purchase',
        'airdrop', 'adjustment'
      ),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(30, 18),
      allowNull: false,
    },
    fee: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
    },
    feeCurrency: {
      type: DataTypes.STRING(20),
      field: 'fee_currency',
    },
    netAmount: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'net_amount',
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'balance_before',
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'balance_after',
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending',
    },
    network: {
      type: DataTypes.STRING(50),
    },
    address: {
      type: DataTypes.STRING(255),
    },
    txHash: {
      type: DataTypes.STRING(255),
      field: 'tx_hash',
    },
    confirmations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    requiredConfirmations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'required_confirmations',
    },
    fromWalletId: {
      type: DataTypes.UUID,
      field: 'from_wallet_id',
    },
    toWalletId: {
      type: DataTypes.UUID,
      field: 'to_wallet_id',
    },
    orderId: {
      type: DataTypes.UUID,
      field: 'order_id',
    },
    tradePair: {
      type: DataTypes.STRING(20),
      field: 'trade_pair',
    },
    price: {
      type: DataTypes.DECIMAL(30, 18),
    },
    quantity: {
      type: DataTypes.DECIMAL(30, 18),
    },
    relatedTransactionId: {
      type: DataTypes.UUID,
      field: 'related_transaction_id',
    },
    description: {
      type: DataTypes.TEXT,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    ip: {
      type: DataTypes.STRING(45),
    },
    device: {
      type: DataTypes.STRING(255),
    },
    processedAt: {
      type: DataTypes.DATE,
      field: 'processed_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at',
    },
    failedAt: {
      type: DataTypes.DATE,
      field: 'failed_at',
    },
    cancelledAt: {
      type: DataTypes.DATE,
      field: 'cancelled_at',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message',
    },
    errorCode: {
      type: DataTypes.STRING(50),
      field: 'error_code',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'transactions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'created_at'] },
      { fields: ['wallet_id'] },
      { fields: ['transaction_id'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['tx_hash'] },
      { fields: ['currency'] },
    ],
    hooks: {
      beforeSave: (transaction) => {
        if (transaction.amount !== undefined && transaction.fee !== undefined) {
          transaction.netAmount = parseFloat(transaction.amount) - parseFloat(transaction.fee);
        }
      },
    },
  });

  // Instance Methods
  Transaction.prototype.markProcessing = async function () {
    this.status = 'processing';
    this.processedAt = new Date();
    return this.save();
  };

  Transaction.prototype.complete = async function (balanceAfter) {
    this.status = 'completed';
    this.completedAt = new Date();
    if (balanceAfter !== undefined) {
      this.balanceAfter = balanceAfter;
    }
    return this.save();
  };

  Transaction.prototype.fail = async function (errorMessage, errorCode) {
    this.status = 'failed';
    this.failedAt = new Date();
    this.errorMessage = errorMessage;
    this.errorCode = errorCode;
    return this.save();
  };

  Transaction.prototype.cancel = async function (reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.notes = reason;
    return this.save();
  };

  return Transaction;
};
