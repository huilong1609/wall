'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Network = sequelize.define('Network', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    network: { type: DataTypes.STRING(100), allowNull: false },
    name: { type: DataTypes.STRING(100) },
    usedAddress: { type: DataTypes.JSONB, field: 'used_address' },

    allowDeposit: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_deposit' },
    allowWithdrawal: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_withdrawal' },

    minWithdrawal: { type: DataTypes.DECIMAL(20,16), defaultValue: 0.00 , field: 'min_withdrawal'  },
    withdrawalFee: { type: DataTypes.DECIMAL(20,16), defaultValue: 0.00 , field: 'withdrawal_fee' },
    confirmation: DataTypes.STRING(10),

    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'networks',
    underscored: true,
    timestamps: true,
    paranoid: true,
  });

  return Network;
};
