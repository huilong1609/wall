const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserBalance = sequelize.define(
    'UserBalance',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },

      balance: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
      },

      profit: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
      },

      bonus: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'user_balance',
      timestamps: true,
      indexes: [
        { fields: ['user_id'], unique: true }, // one balance row per user
      ],
    }
  );

  return UserBalance;
};
