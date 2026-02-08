require('dotenv').config();

module.exports = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database (PostgreSQL)
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'trading_platform',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expire: process.env.JWT_EXPIRE || '15m',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
  },

  // Bcrypt
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
  },

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // File Upload
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880,
    path: process.env.UPLOAD_PATH || './uploads',
  },

  // 2FA
  twoFA: {
    appName: process.env.TWO_FA_APP_NAME || 'TradingPlatform',
  },

  // External APIs
  apis: {
    coingecko: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY,
    finnhub: process.env.FINNHUB_API_KEY,
  },

  // WebSocket
  wsPort: parseInt(process.env.WS_PORT, 10) || 5001,

  // Redis
  redisUrl: process.env.REDIS_URL,

  // Crypto Wallets
  wallets: {
    btc: process.env.CRYPTO_WALLET_BTC,
    eth: process.env.CRYPTO_WALLET_ETH,
    usdt: process.env.CRYPTO_WALLET_USDT,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || './logs/app.log',
  },

  // Trading Constants
  trading: {
    spotFee: 0.001,
    futuresFee: 0.0004,
    forexSpread: 0.0002,
    minOrderAmount: 10,
    maxLeverage: 100,
  },

  // Referral
  referral: {
    defaultCommission: 0.2,
    tiers: [
      { name: 'bronze', minReferrals: 0, commission: 0.2 },
      { name: 'silver', minReferrals: 11, commission: 0.25 },
      { name: 'gold', minReferrals: 26, commission: 0.3 },
      { name: 'platinum', minReferrals: 51, commission: 0.4 },
    ],
  },

  // Staking
  staking: {
    minLockPeriod: 7,
    maxLockPeriod: 365,
    earlyUnstakePenalty: 0.1,
  },

  // Verification Limits
  verificationLimits: {
    level1: { daily: 2000, monthly: 10000 },
    level2: { daily: 50000, monthly: 200000 },
    level3: { daily: 500000, monthly: 2000000 },
    level4: { daily: Infinity, monthly: Infinity },
  },
};