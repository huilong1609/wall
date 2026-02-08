'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Coin = sequelize.define('Coin', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    logo: {
      type: DataTypes.STRING(255)
    },
    symbol: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    allowWallet: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'allow_wallet'
    },
    allowWithdrawal: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'allow_withdrawal'
    },
    allowDeposit: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'allow_deposit'
    },
    allowSwap: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'allow_swap'
    },
    minDeposit: {
      type: DataTypes.DECIMAL(20,16),
      field: 'min_deposit'
    },
    minWithdrawal: {
      type: DataTypes.STRING(20,16),
      field: 'min_withdrawal'
    },
    digits: {
      type: DataTypes.INTEGER,
      defaultValue: 6
    },
    menu: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    popular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    defaultNetwork: {
      type: DataTypes.UUID,
      field: 'default_network'
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    tableName: 'coins',
    underscored: true,
    timestamps: true,
    paranoid: true,
  });

  return Coin;
};
