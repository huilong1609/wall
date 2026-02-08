'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Market = sequelize.define(
        'Market',
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },

            name: {
                type: DataTypes.STRING(200),
                allowNull: false,
            },

            symbol: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
            },

            price: {
                type: DataTypes.NUMERIC(30, 18),
                allowNull: false,
                defaultValue: 0,
            },

            change1h: {
                type: DataTypes.NUMERIC(10, 4),
                defaultValue: 0,
                field: 'change_1h',
            },

            change24h: {
                type: DataTypes.NUMERIC(10, 4),
                defaultValue: 0,
                field: 'change_24h',
            },

            change7d: {
                type: DataTypes.NUMERIC(10, 4),
                defaultValue: 0,
                field: 'change_7d',
            },

            totalMarketCap: {
                type: DataTypes.NUMERIC(40, 18),
                defaultValue: 0,
                field: 'total_market_cap',
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            market: {
                type: DataTypes.ENUM(
                    'spot',
                    'futures',
                    'margin',
                    'forex',
                    'stocks'
                ),
                allowNull: false,
            },
        },
        {
            tableName: 'markets',
            timestamps: true,
            underscored: true,

            indexes: [
                { fields: ['symbol'] },
                { fields: ['market'] },
                { fields: ['created_at'] },
            ],
        }
    );

    /* ============================
       Associations (optional)
    ============================ */

    // Market.hasMany(models.Order, { foreignKey: 'symbol', sourceKey: 'symbol' });
    // Market.hasMany(models.Trade, { foreignKey: 'symbol', sourceKey: 'symbol' });

    /* ============================
       Class Methods
    ============================ */

    Market.updatePrice = async function (symbol, data) {
        return this.update(
            {
                price: data.price,
                change1h: data.change1h,
                change24h: data.change24h,
                change7d: data.change7d,
                totalMarketCap: data.totalMarketCap,
            },
            { where: { symbol } }
        );
    };

    Market.createNew = async function (data){
        return this.create(data)
    }

    Market.getByMarketType = async function (market) {
        return this.findAll({ where: { market } });
    };

    /* ============================
       Instance Methods
    ============================ */

    Market.prototype.formatTicker = function () {
        return {
            symbol: this.symbol,
            price: this.price,
            change24h: this.change24h,
            market: this.market,
        };
    };

    return Market;
};
