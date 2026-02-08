'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('coin_networks', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },

      coin_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'coins', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      network_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'networks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      withdrawal_fee: { type: Sequelize.DECIMAL(20,16), defaultValue:0.00 },
      status: { type: Sequelize.BOOLEAN, defaultValue: true },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: Sequelize.DATE },
    });

    await queryInterface.addIndex('coin_networks', ['coin_id'], { name: 'idx_coin_networks_coin_id' });
    await queryInterface.addIndex('coin_networks', ['network_id'], { name: 'idx_coin_networks_network_id' });
    await queryInterface.addIndex('coin_networks', ['coin_id', 'network_id'], { name: 'idx_coin_networks_coin_network' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('coin_networks');
  },
};
