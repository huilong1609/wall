const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate, requireKyc } = require('../middleware/auth');
const { withdrawalLimiter } = require('../middleware/rateLimiter');
const { validate, rules, body, query, param } = require('../middleware/validation');

/**
 * @route   GET /api/v1/wallets
 * @desc    Get all user wallets
 * @access  Private
 */
router.get('/', authenticate, walletController.getWallets);

/**
 * @route   GET /api/v1/wallets/overview
 * @desc    Get wallet overview (balances, totals)
 * @access  Private
 */
router.get('/overview', authenticate, walletController.getOverview);

router.get('/deposit', authenticate, walletController.getDeposit);

router.get('/withdraw', authenticate, walletController.getWithdrawal);


/**
 * @route   POST /api/v1/wallets/deposit/address
 * @desc    Get or create deposit address
 * @access  Private
 */
router.post(
  '/deposit/address',
  authenticate,
  [
    rules.symbol,
    body('network').optional().trim(),
  ],
  validate,
  walletController.getDepositAddress
);

/**
 * @route   GET /api/v1/wallets/deposit/history
 * @desc    Get deposit history
 * @access  Private
 */
router.get(
  '/deposit/history',
  authenticate,
  [
    query('currency').optional().trim().toUpperCase(),
    query('status').optional().isIn(['pending', 'completed', 'failed']),
    rules.page,
    rules.limit,
  ],
  validate,
  walletController.getDepositHistory
);

/**
 * @route   POST /api/v1/wallets/withdraw
 * @desc    Request withdrawal
 * @access  Private
 */
router.post(
  '/withdraw',
  authenticate,
  requireKyc('level1'),
  withdrawalLimiter,
  [
    rules.currency,
    rules.amount,
    rules.address,
    body('network').optional().trim(),
    body('memo').optional().trim(),
    body('twoFactorCode').optional().isLength({ min: 6, max: 6 }),
  ],
  validate,
  walletController.requestWithdrawal
);

/**
 * @route   GET /api/v1/wallets/withdraw/history
 * @desc    Get withdrawal history
 * @access  Private
 */
router.get(
  '/withdraw/history',
  authenticate,
  [
    query('currency').optional().trim().toUpperCase(),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled']),
    rules.page,
    rules.limit,
  ],
  validate,
  walletController.getWithdrawalHistory
);

/**
 * @route   DELETE /api/v1/wallets/withdraw/:id
 * @desc    Cancel pending withdrawal
 * @access  Private
 */
router.delete(
  '/withdraw/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  walletController.cancelWithdrawal
);

/**
 * @route   POST /api/v1/wallets/transfer
 * @desc    Transfer between wallets
 * @access  Private
 */
router.post(
  '/transfer',
  authenticate,
  [
    body('from').isIn(['spot', 'futures', 'margin', 'funding', 'earn']),
    body('to').isIn(['spot', 'futures', 'margin', 'funding', 'earn']),
    rules.currency,
    rules.amount,
  ],
  validate,
  walletController.transferBetweenWallets
);

/**
 * @route   GET /api/v1/wallets/transfer/history
 * @desc    Get transfer history
 * @access  Private
 */
router.get('/transfer/history', authenticate, walletController.getTransferHistory);

/**
 * @route   GET /api/v1/wallets/transactions
 * @desc    Get all transactions
 * @access  Private
 */
router.get(
  '/transactions',
  authenticate,
  [
    query('type').optional().isIn([
      'deposit', 'withdrawal', 'transfer_in', 'transfer_out',
      'trade_buy', 'trade_sell', 'fee', 'referral_bonus'
    ]),
    query('symbol').optional().trim().toUpperCase(),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    rules.page,
    rules.limit,
  ],
  validate,
  walletController.getTransactions
);

/**
 * @route   GET /api/v1/wallets/transactions/:id
 * @desc    Get transaction details
 * @access  Private
 */
router.get(
  '/transactions/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  walletController.getTransactionById
);

/**
 * @route   GET /api/v1/wallets/whitelist
 * @desc    Get withdrawal whitelist addresses
 * @access  Private
 */
router.get('/whitelist', authenticate, walletController.getWhitelistAddresses);

/**
 * @route   POST /api/v1/wallets/whitelist
 * @desc    Add address to whitelist
 * @access  Private
 */
router.post(
  '/whitelist',
  authenticate,
  [
    rules.currency,
    rules.address,
    body('network').optional().trim(),
    body('label').trim().isLength({ max: 100 }),
  ],
  validate,
  walletController.addWhitelistAddress
);

/**
 * @route   DELETE /api/v1/wallets/whitelist/:id
 * @desc    Remove address from whitelist
 * @access  Private
 */
router.delete(
  '/whitelist/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  walletController.removeWhitelistAddress
);

/**
 * @route   GET /api/v1/wallets/:type
 * @desc    Get wallet by type (spot, futures, margin, etc.)
 * @access  Private
 */
router.get(
  '/:type',
  authenticate,
  [param('type').isIn(['spot', 'futures', 'margin', 'funding', 'earn'])],
  validate,
  walletController.getWalletByType
);

/**
 * @route   GET /api/v1/wallets/:type/:currency
 * @desc    Get balance for specific currency in wallet type
 * @access  Private
 */
router.get('/:type/:currency', authenticate, walletController.getBalance);

module.exports = router;
