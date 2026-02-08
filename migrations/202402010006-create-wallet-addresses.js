'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('wallet_addresses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },

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

      network_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'networks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      network_address_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'network_addresses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      address: { type: Sequelize.STRING(2000), allowNull: false },

      status: {
        type: Sequelize.ENUM('used', 'active', 'archived'),
        allowNull: false,
      },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('wallet_addresses', ['user_id'], { name: 'idx_wallet_addresses_user_id' });
    await queryInterface.addIndex('wallet_addresses', ['coin_id'], { name: 'idx_wallet_addresses_coin_id' });
    await queryInterface.addIndex('wallet_addresses', ['network_id'], { name: 'idx_wallet_addresses_network_id' });
    await queryInterface.addIndex('wallet_addresses', ['network_address_id'], { name: 'idx_wallet_addresses_network_address_id' });
    await queryInterface.addIndex('wallet_addresses', ['status'], { name: 'idx_wallet_addresses_status' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('wallet_addresses');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_wallet_addresses_status";');
  },
};
