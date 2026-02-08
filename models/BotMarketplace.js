const { DataTypes } = require('sequelize');


module.exports = (sequelize) => {
  const BotMarketplace =
    sequelize.define('BotMarketplace', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category: {
        type: DataTypes.ENUM('grid', 'dca', 'arbitrage', 'scalping', 'trend', 'custom'),
        allowNull: false,
      },
      creator: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      creatorVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0,
      },
      reviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      users: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      pricePeriod: {
        type: DataTypes.ENUM('free', 'month', 'year', 'lifetime'),
        defaultValue: 'month',
      },
      tier: {
        type: DataTypes.ENUM('free', 'standard', 'premium'),
        defaultValue: 'standard',
      },
      performance: {
        type: DataTypes.TEXT, // JSON stringified performance metrics
        allowNull: false,
      },
      supportedPairs: {
        type: DataTypes.TEXT, // JSON array of supported pairs
        allowNull: false,
      },
      supportedExchanges: {
        type: DataTypes.TEXT, // JSON array of supported exchanges
        allowNull: false,
      },
      features: {
        type: DataTypes.TEXT, // JSON array of features
        allowNull: false,
      },
      minCapital: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
      },
      tags: {
        type: DataTypes.TEXT, // JSON array of tags
      },
      strategyCode: {
        type: DataTypes.TEXT, // The bot strategy code/template
        allowNull: false,
      },
      defaultConfig: {
        type: DataTypes.TEXT, // JSON stringified default config
        allowNull: false,
      },
      chartData: {
        type: DataTypes.TEXT, // JSON stringified chart data for preview
      },
      isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      downloads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      activeInstances: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    }, {
      tableName: 'BotMarketplaces',
      timestamps: true,
      indexes: [
        { fields: ['category'] },
        { fields: ['tier'] },
        { fields: ['isPublished'] },
        { fields: ['isFeatured'] },
        { fields: ['rating'] },
      ],
    });
  return BotMarketplace
}
