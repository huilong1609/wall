'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('coins', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      logo: {
        type: Sequelize.STRING(255)
      },
      symbol: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      allow_withdrawal: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      allow_deposit: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      allow_swap: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      allow_wallet: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      min_deposit: {
        type: Sequelize.DECIMAL(20, 16),
        defaultValue: 0.00
      },
      min_withdrawal: {
        type: Sequelize.DECIMAL(20, 16),
        defaultValue: 0.00
      },
      digits: {
        type: Sequelize.INTEGER,
        defaultValue: 6
      },
      menu: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      popular: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      default_network: {
        type: Sequelize.UUID
      },
      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      deleted_at: {
        type: Sequelize.DATE
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('coins');
  },
};
