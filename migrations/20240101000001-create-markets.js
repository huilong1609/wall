'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('markets', {
            id: {
                type: Sequelize.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },

            name: {
                type: Sequelize.STRING(200),
                allowNull: false,
            },

            symbol: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },

            logo: {
                type: Sequelize.STRING(500),
                allowNull: false,
            },
            meta_data: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            price: {
                type: Sequelize.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
            },

            change_1h: {
                type: Sequelize.DECIMAL(10, 4),
                defaultValue: 0,
            },

            change_24h: {
                type: Sequelize.DECIMAL(10, 4),
                defaultValue: 0,
            },

            change_7d: {
                type: Sequelize.DECIMAL(10, 4),
                defaultValue: 0,
            },

            total_market_cap: {
                type: Sequelize.DECIMAL(40, 18),
                defaultValue: 0,
            },

            market: {
                type: Sequelize.ENUM('spot', 'futures', 'margin', 'forex', 'stocks'),
                allowNull: false,
            },

            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },

            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Indexes
        await queryInterface.addIndex('markets', ['symbol']);
        await queryInterface.addIndex('markets', ['market']);
        await queryInterface.addIndex('markets', ['created_at']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('markets');
        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_markets_market";'
        );
    },
};
