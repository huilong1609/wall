'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('network_addresses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },

      network_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'networks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      assigned_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      address: { type: Sequelize.STRING(225), allowNull: false },

      status: {
        type: Sequelize.ENUM('available', 'assigned', 'retired'),
        allowNull: false,
      },

      assigned_at: { type: Sequelize.DATE },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('network_addresses', ['network_id'], { name: 'idx_network_addresses_network_id' });
    await queryInterface.addIndex('network_addresses', ['assigned_user_id'], { name: 'idx_network_addresses_assigned_user_id' });
    await queryInterface.addIndex('network_addresses', ['status'], { name: 'idx_network_addresses_status' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('network_addresses');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_network_addresses_status";');
  },
};
