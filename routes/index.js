const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const userRoutes = require('./users');
const walletRoutes = require('./wallets');
const planRoutes = require('./plans');
const tradingRoutes = require('./trading');
const marketRoutes = require('./markets');
const botRoutes = require('./bot');
const signalRoutes = require('./signal');
const notificationRoutes = require('./notifications');
const alertRoutes = require('./alerts');
const stakingRoutes = require('./staking');
const referralRoutes = require('./referrals');
const supportRoutes = require('./support');
const copyTradingRoutes = require('./copyTrading');
const kycRoutes = require('./kyc');
const apiKeyRoutes = require('./apiKeys');
const publicRoutes = require('./public');

// Mount routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/wallets', walletRoutes);
router.use('/plans', planRoutes);
router.use('/bots', botRoutes);
router.use('/signals', signalRoutes);
router.use('/trading', tradingRoutes);
router.use('/markets', marketRoutes);
router.use('/notifications', notificationRoutes);
router.use('/alerts', alertRoutes);
router.use('/staking', stakingRoutes);
router.use('/referrals', referralRoutes);
router.use('/support', supportRoutes);
router.use('/copy-trading', copyTradingRoutes);
router.use('/kyc', kycRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/public', publicRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
  });
});

module.exports = router;
