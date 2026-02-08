'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('CoinNetwork', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    coinId: { type: DataTypes.UUID, allowNull: false, field: 'coin_id',references: {
          model: 'coins',
          key: 'id',
        }, },
    networkId: { type: DataTypes.UUID, allowNull: false, field: 'network_id', references: {
          model: 'networks',
          key: 'id',
        }, },
    withdrawalFee: { 
      type: DataTypes.DECIMAL(20,16), 
      defaultValue: 0.00,
      field: 'withdrawal_fee',
        },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'coin_networks',
    underscored: true,
    timestamps: true,
    paranoid: true,
  });
};
