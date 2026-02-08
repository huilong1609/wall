'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('networks', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },

      network: { type: Sequelize.STRING(100), allowNull: false },
      name: { type: Sequelize.STRING(100) },
      used_address: { type: Sequelize.JSONB },
      allow_deposit: { type: Sequelize.BOOLEAN, defaultValue: true },
      allow_withdrawal: { type: Sequelize.BOOLEAN, defaultValue: true },

      min_withdrawal: { type: Sequelize.DECIMAL(20,16) , defaultValue: 0.00 },
      withdrawal_fee: { type: Sequelize.DECIMAL(20,16) , defaultValue: 0.00  },
      confirmation: { type: Sequelize.STRING(10) },

      status: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: Sequelize.DATE },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('networks');
  },
};
