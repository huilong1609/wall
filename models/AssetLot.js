const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssetLot = sequelize.define(
    'AssetLot',
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

      asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
      },

      buy_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
      },

      remaining_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM('open', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
    },
    {
      tableName: 'asset_lots',
      timestamps: true,
      indexes: [
        { fields: ['user_id', 'asset_id'] },
        { fields: ['status'] },
      ],
    }
  );

  return AssetLot;
};
