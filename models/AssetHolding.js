const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssetHolding = sequelize.define(
    'AssetHolding',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      assetId: {
        type: DataTypes.UUID,
        allowNull: false,
        field:'asset_id'
      },

      quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
      },

      avg_buy_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
      },

      total_cost: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'asset_holdings',
      timestamps: true,
      underscored: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ['user_id', 'asset_id'] },
      ],
    }
  );

  return AssetHolding;
};
