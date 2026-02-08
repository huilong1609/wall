'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Wallet', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reference: DataTypes.STRING(20),
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id', 
      references:{
      model: 'users',
      key: 'id'
    } 
  },
    coinId: { type: DataTypes.UUID, allowNull: false, field: 'coin_id', 
      references:{
      model: 'coins',
      key: 'id'
    }  },

    balance: { type: DataTypes.DECIMAL(20,18), defaultValue:0.00 , allowNull: false },
    lockedBalance: { type: DataTypes.DECIMAL(20,18),  defaultValue:0.00 , field: 'locked_balance' },

    lockStatus: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'lock_status' },
    lockReason: {
      type: DataTypes.TEXT,
      field: 'lock_reason',
    },
    lockedAt: {
      type: DataTypes.DATE,
      field: 'locked_at',
    },
    allowDeposit: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_deposit' },
    allowSend: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_send' },
    allowSwap: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_swap' },

    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'wallets',
    underscored: true,
    timestamps: true,
    paranoid: true,
  });
};
