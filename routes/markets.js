const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');
const { optionalAuth } = require('../middleware/auth');
const { validate, rules, query, param } = require('../middleware/validation');

/**
 * @route   GET /api/v1/markets/assets
 * @desc    Get all assets
 * @access  Public
 */


router.get(
  '/assets',
  [
    query('type').optional().isIn(['crypto', 'fiat', 'stock', 'forex', 'commodity']),
    query('status').optional().isIn(['active', 'inactive']),
    query('search').optional().trim(),
    rules.page,
    rules.limit,
  ],
  validate,
  marketController.getAssets
);

/**
 * @route   GET /api/v1/markets/assets/:symbol
 * @desc    Get asset by symbol
 * @access  Public
 */
router.get(
  '/asset/:symbol',
  [param('symbol').trim().toUpperCase()],
  validate,
  marketController.getAssetBySymbol
);

/**
 * @route   GET /api/v1/markets/pairs
 * @desc    Get all trading pairs
 * @access  Public
 */
router.get(
  '/pairs',
  [
    query('market').optional().isIn(['spot', 'futures', 'margin', 'forex', 'stocks']),
    query('baseAsset').optional().trim().toUpperCase(),
    query('quoteAsset').optional().trim().toUpperCase(),
    query('status').optional().isIn(['active', 'inactive', 'halt']),
    rules.page,
    rules.limit,
  ],
  validate,
  marketController.getTradingPairs
);

/**
 * @route   GET /api/v1/markets/pairs/:symbol
 * @desc    Get trading pair by symbol
 * @access  Public
 */
router.get(
  '/pairs/:symbol',
  [param('symbol').trim().toUpperCase()],
  validate,
  marketController.getTradingPairBySymbol
);

/**
 * @route   GET /api/v1/markets/ticker
 * @desc    Get all tickers
 * @access  Public
 */
router.get(
  '/ticker',
  [query('market').optional().isIn(['spot', 'futures', 'margin', 'forex', 'stocks'])],
  validate,
  marketController.getTickers
);

/**
 * @route   GET /api/v1/markets/ticker/:symbol
 * @desc    Get ticker for symbol
 * @access  Public
 */
router.get(
  '/ticker/:symbol',
  [param('symbol').trim().toUpperCase()],
  validate,
  marketController.getTickerBySymbol
);

/**
 * @route   GET /api/v1/markets/orderbook/:symbol
 * @desc    Get order book for symbol
 * @access  Public
 */
router.get(
  '/orderbook/:symbol',
  [
    param('symbol').trim().toUpperCase(),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  ],
  validate,
  marketController.getOrderBook
);

/**
 * @route   GET /api/v1/markets/trades/:symbol
 * @desc    Get recent trades for symbol
 * @access  Public
 */
router.get(
  '/trades/:symbol',
  [
    param('symbol').trim().toUpperCase(),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  ],
  validate,
  marketController.getRecentTrades
);

/**
 * @route   GET /api/v1/markets/klines/:symbol
 * @desc    Get klines/candlesticks for symbol
 * @access  Public
 */
router.get(
  '/klines/:symbol',
  [
    param('symbol').trim().toUpperCase(),
    query('interval').isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']),
    query('startTime').optional().isInt(),
    query('endTime').optional().isInt(),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  ],
  validate,
  marketController.getKlines
);

/**
 * @route   GET /api/v1/markets/stats
 * @desc    Get market statistics
 * @access  Public
 */
router.get('/stats', marketController.getMarketStats);

/**
 * @route   GET /api/v1/markets/gainers
 * @desc    Get top gainers
 * @access  Public
 */
router.get(
  '/gainers',
  [
    query('market').optional().isIn(['spot', 'futures']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  marketController.getTopGainers
);

/**
 * @route   GET /api/v1/markets/losers
 * @desc    Get top losers
 * @access  Public
 */
router.get(
  '/losers',
  [
    query('market').optional().isIn(['spot', 'futures']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  marketController.getTopLosers
);

/**
 * @route   GET /api/v1/markets/volume
 * @desc    Get top by volume
 * @access  Public
 */
router.get(
  '/volume',
  [
    query('market').optional().isIn(['spot', 'futures']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  marketController.getTopByVolume
);

module.exports = router;
