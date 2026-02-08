'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('plans', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(100) },
      tagline: { type: Sequelize.TEXT },
      description: { type: Sequelize.TEXT },
      price: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
      max_price: { type: Sequelize.STRING(50)},
      features: { type: Sequelize.JSONB },
      limits: { type: Sequelize.JSONB },
      highlight: { type: Sequelize.BOOLEAN, defaultValue: false },
      type: { type: Sequelize.ENUM('Main', 'Promo') },
      roi: { type: Sequelize.DECIMAL(20, 4) },
      roi_type: { type: Sequelize.ENUM('percent', 'flat'), defaultValue: 'percent' },
      roi_interval: { type: Sequelize.ENUM('hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'annually') },
      duration: { type: Sequelize.INTEGER },
      duration_type: { type: Sequelize.ENUM('hour', 'day', 'week', 'month', 'year' ,'unlimited') },
      config: { type: Sequelize.JSONB },
      status: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('plans');
  },
};
