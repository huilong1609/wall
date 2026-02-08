const express = require('express');
const router = express.Router();
const tradingController = require('../controllers/tradingController');
const { authenticate } = require('../middleware/auth');
const { tradingLimiter } = require('../middleware/rateLimiter');
const { validate, body, query, param } = require('../middleware/validation');

router.get('/overview' , authenticate , tradingController.getOverview)

router.get('/terminal' , authenticate , tradingController.getTerminal)

router.get('/markets/:type' , authenticate , tradingController.getMarketsByType)
/**
 * @route   POST /api/v1/trading/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post(
  '/orders',
  authenticate,
  tradingLimiter,
  [
    body('market').isIn(['spot', 'futures', 'margin', 'forex', 'stocks']),
    body('symbol').trim().toUpperCase().notEmpty(),
    body('side').isIn(['buy', 'sell']),
    body('type').isIn(['market', 'limit', 'stop_limit', 'stop_market']),
    body('quantity').isFloat({ min: 0 }),
    body('price').optional().isFloat({ min: 0 }),
    body('stopPrice').optional().isFloat({ min: 0 }),
    body('leverage').optional().isInt({ min: 1, max: 125 }),
    body('takeProfit').optional().isFloat({ min: 0 }),
    body('stopLoss').optional().isFloat({ min: 0 }),
    body('timeInForce').optional().isIn(['GTC', 'IOC', 'FOK', 'GTD']),
    body('reduceOnly').optional().isBoolean(),
    body('postOnly').optional().isBoolean(),
    body('clientOrderId').optional().trim().isLength({ max: 100 }),
  ],
  validate,
  tradingController.createOrder
);


/**
 * @route   GET /api/v1/trading/orders
 * @desc    Get all orders
 * @access  Private
 */
router.get(
  '/orders',
  authenticate,
  [
    query('market').optional().isIn(['spot', 'futures', 'margin', 'forex', 'stocks']),
    query('symbol').optional().trim().toUpperCase(),
    query('side').optional().isIn(['buy', 'sell']),
    query('status').optional().isIn(['pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  tradingController.getOrders
);

/**
 * @route   GET /api/v1/trading/orders/open
 * @desc    Get open orders
 * @access  Private
 */
router.get(
  '/orders/open',
  authenticate,
  [
    query('market').optional().isIn(['spot', 'futures', 'margin', 'forex', 'stocks']),
    query('symbol').optional().trim().toUpperCase(),
  ],
  validate,
  tradingController.getOpenOrders
);

/**
 * @route   GET /api/v1/trading/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get(
  '/orders/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  tradingController.getOrderById
);

/**
 * @route   DELETE /api/v1/trading/orders/:id
 * @desc    Cancel order
 * @access  Private
 */
router.delete(
  '/orders/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  tradingController.cancelOrder
);

/**
 * @route   DELETE /api/v1/trading/orders
 * @desc    Cancel all open orders
 * @access  Private
 */
router.delete(
  '/orders',
  authenticate,
  [
    query('market').optional().isIn(['spot', 'futures', 'margin', 'forex', 'stocks']),
    query('symbol').optional().trim().toUpperCase(),
  ],
  validate,
  tradingController.cancelAllOrders
);

/**
 * @route   GET /api/v1/trading/trades
 * @desc    Get trade history
 * @access  Private
 */
router.get(
  '/trades',
  authenticate,
  [
    query('market').optional().isIn(['spot', 'futures', 'margin', 'forex', 'stocks']),
    query('symbol').optional().trim().toUpperCase(),
    query('side').optional().isIn(['buy', 'sell']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  tradingController.getTrades
);

/**
 * @route   GET /api/v1/trading/trades/:id
 * @desc    Get trade by ID
 * @access  Private
 */
router.get(
  '/trades/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  tradingController.getTradeById
);

/**
 * @route   GET /api/v1/trading/statistics
 * @desc    Get trading statistics
 * @access  Private
 */
router.get(
  '/statistics',
  authenticate,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validate,
  tradingController.getStatistics
);

/**
 * @route   GET /api/v1/trading/pnl
 * @desc    Get profit/loss data
 * @access  Private
 */
router.get(
  '/pnl',
  authenticate,
  [query('period').optional().isIn(['7d', '30d', '90d', '365d'])],
  validate,
  tradingController.getProfitLoss
);

module.exports = router;
