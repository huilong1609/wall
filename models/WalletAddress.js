'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('WalletAddress', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false,references: { model: 'users', key: 'id' }, field: 'user_id' },
    coinId: { type: DataTypes.UUID, allowNull: false,  references: { model: 'coins', key: 'id' }, field: 'coin_id' },
    networkId: { type: DataTypes.UUID,  allowNull: false,references: { model: 'networks', key: 'id' }, field: 'network_id' },
    networkAddressId: { type: DataTypes.UUID, allowNull: false, references: { model: 'network_addresses', key: 'id' }, field: 'network_address_id' },

    address: { type: DataTypes.STRING(2000), allowNull: false },
    status: {
      type: DataTypes.ENUM('used', 'active', 'archived'),
      allowNull: false,
    },
  }, {
    tableName: 'wallet_addresses',
    underscored: true,
    timestamps: true,
  });
};
