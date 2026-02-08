'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_plans', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'plans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reference: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      amount: { type: Sequelize.DECIMAL(20, 2), allowNull: false },
      exchange_rate: { type: Sequelize.DECIMAL(15, 6) },
      status: {
        type: Sequelize.ENUM('pending','active','completed','cancelled','paused','ended'),
        allowNull: false,
        defaultValue: 'pending',
      },
      investment_duration: { type: Sequelize.JSONB },
      roi: { type: Sequelize.DECIMAL(20, 2), allowNull: false, defaultValue: 0.0 },
      total_return: { type: Sequelize.DECIMAL(20, 2), allowNull: false, defaultValue: 0.0 },
      auto_reinvest: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      metadata: { type: Sequelize.JSONB },
      activated_at: { type: Sequelize.DATE },
      end_date: { type: Sequelize.DATE },
      last_payout_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('user_plans', ['user_id'], { name: 'idx_user_plans_user_id' });
    await queryInterface.addIndex('user_plans', ['plan_id'], { name: 'idx_user_plans_plan_id' });
    await queryInterface.addIndex('user_plans', ['status'], { name: 'idx_user_plans_status' });
    await queryInterface.addIndex('user_plans', ['activated_at'], { name: 'idx_user_plans_activated_at' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_plans');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_plans_status";');
  },
};
