'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Coupon = sequelize.define('Coupon', {

    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING(100) },
      type: { type: DataTypes.ENUM('all' , 'signal' , 'deposit' , 'plan') },
      applicable:{type: DataTypes.JSONB},
      discount: {type: DataTypes.DECIMAL(20,4)},
      discount_type: {type: DataTypes.ENUM('percent' , 'flat') , defaultValue: 'percent'},
      status: { type: DataTypes.ENUM('expired' , 'used' , 'active'), defaultValue: 'active' },
  }, {
    tableName: 'coupons',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });


  return Coupon;
};
