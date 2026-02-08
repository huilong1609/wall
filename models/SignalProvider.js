const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SignalProvider = sequelize.define('SignalProvider', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  avatar: {
    type: DataTypes.STRING,
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
  },
  totalSignals: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  successfulSignals: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  winRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  avgProfitPercent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  totalProfit: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
  },
  subscribers: {
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
    type: DataTypes.ENUM('free', 'basic', 'premium', 'elite'),
    defaultValue: 'basic',
  },
  specialties: {
    type: DataTypes.TEXT, // JSON array of specialties/markets
  },
  supportedPairs: {
    type: DataTypes.TEXT, // JSON array of supported pairs
  },
  tradingStyle: {
    type: DataTypes.STRING,
  },
  experience: {
    type: DataTypes.STRING, // e.g., "5+ years"
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  telegramChannel: {
    type: DataTypes.STRING,
  },
  discordServer: {
    type: DataTypes.STRING,
  },
  website: {
    type: DataTypes.STRING,
  },
  performanceData: {
    type: DataTypes.TEXT, // JSON stringified performance history
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['verified'] },
    { fields: ['status'] },
    { fields: ['tier'] },
    { fields: ['winRate'] },
    { fields: ['rating'] },
  ],
});
return SignalProvider
}
