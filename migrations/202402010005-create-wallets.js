'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('wallets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },

      reference: { type: Sequelize.STRING(20) },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      coin_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'coins', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      balance: { type: Sequelize.DECIMAL(20,18), defaultValue:0.00, allowNull: false },
      locked_balance: { type: Sequelize.DECIMAL(20,18), defaultValue:0.00 },

      lock_status: { type: Sequelize.BOOLEAN, defaultValue: false },
      lock_reason: {
        type: Sequelize.TEXT,
      },
      locked_at: {
        type: Sequelize.DATE,
      },
      allow_deposit: { type: Sequelize.BOOLEAN, defaultValue: true },
      allow_send: { type: Sequelize.BOOLEAN, defaultValue: true },
      allow_swap: { type: Sequelize.BOOLEAN, defaultValue: true },

      status: { type: Sequelize.BOOLEAN, defaultValue: true },


      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: Sequelize.DATE },
    });

    await queryInterface.addIndex('wallets', ['user_id'], { name: 'idx_wallets_user_id' });
    await queryInterface.addIndex('wallets', ['coin_id'], { name: 'idx_wallets_coin_id' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('wallets');
  },
};
