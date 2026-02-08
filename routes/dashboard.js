const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { validate, query } = require('../middleware/validation');

/**
 * @route   GET /api/v1/dashboard
 * @desc    Get dashboard overview
 * @access  Private
 */
router.get('/', authenticate, dashboardController.getOverview);

/**
 * @route   GET /api/v1/dashboard/all
 * @desc    Get all dashboard data in one call
 * @access  Private
 */
router.get('/all', authenticate, dashboardController.getAllDashboardData);

/**
 * @route   GET /api/v1/dashboard/portfolio
 * @desc    Get portfolio summary
 * @access  Private
 */
router.get('/portfolio', authenticate, dashboardController.getPortfolio);

/**
 * @route   GET /api/v1/dashboard/trading-stats
 * @desc    Get trading statistics
 * @access  Private
 */
router.get(
  '/trading-stats',
  authenticate,
  [query('period').optional().isIn(['7d', '30d', '90d', '365d'])],
  validate,
  dashboardController.getTradingStats
);

/**
 * @route   GET /api/v1/dashboard/activity
 * @desc    Get account activity
 * @access  Private
 */
router.get(
  '/activity',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  dashboardController.getActivity
);

/**
 * @route   GET /api/v1/dashboard/pnl-chart
 * @desc    Get P&L chart data
 * @access  Private
 */
router.get(
  '/pnl-chart',
  authenticate,
  [query('period').optional().isIn(['7d', '30d', '90d', '365d'])],
  validate,
  dashboardController.getPnLChart
);

/**
 * @route   GET /api/v1/dashboard/balance-chart
 * @desc    Get balance history chart
 * @access  Private
 */
router.get(
  '/balance-chart',
  authenticate,
  [query('period').optional().isIn(['7d', '30d', '90d', '365d'])],
  validate,
  dashboardController.getBalanceChart
);

/**
 * @route   GET /api/v1/dashboard/quick-stats
 * @desc    Get quick stats for widgets
 * @access  Private
 */
router.get('/quick-stats', authenticate, dashboardController.getQuickStats);

/**
 * @route   GET /api/v1/dashboard/notifications
 * @desc    Get recent notifications
 * @access  Private
 */
router.get(
  '/notifications',
  authenticate,
  [query('limit').optional().isInt({ min: 1, max: 20 }).toInt()],
  validate,
  dashboardController.getRecentNotifications
);

/**
 * @route   GET /api/v1/dashboard/market-overview
 * @desc    Get market overview
 * @access  Private
 */
router.get('/market-overview', authenticate, dashboardController.getMarketOverview);

module.exports = router;
