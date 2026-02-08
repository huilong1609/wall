'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('NetworkAddress', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    networkId: { 
      type: DataTypes.UUID,
       allowNull: false, 
       field: 'network_id',
      references:{
        model: 'networks',
        key: 'id'
      }
     },
    assignedUserId: { type: DataTypes.UUID, field: 'assigned_user_id',
      references:{
        model: 'users',
        key: 'id'
      } },
    address: { type: DataTypes.STRING(225), allowNull: false },
    status: {
      type: DataTypes.ENUM('available', 'assigned', 'retired'),
      allowNull: false,
    },
    assignedAt: { type: DataTypes.DATE, field: 'assigned_at' },
  }, {
    tableName: 'network_addresses',
    underscored: true,
    timestamps: true,
  });
};
