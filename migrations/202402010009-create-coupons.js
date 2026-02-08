'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('coupons', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(100) },
      type: { type: Sequelize.ENUM('all' , 'signal' , 'deposit' , 'plan') },
      applicable:{type: Sequelize.JSONB},
      discount: {type: Sequelize.DECIMAL(20,4)},
      discount_type: {type: Sequelize.ENUM('percent' , 'flat') , defaultValue: 'percent'},
      status: { type: Sequelize.ENUM('expired' , 'used' , 'active'), defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('coupons');
  },
};
