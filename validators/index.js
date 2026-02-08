/**
 * ============================================
 * INPUT VALIDATORS
 * ============================================
 */

const { body, param, query, validationResult } = require('express-validator');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Validation result handler
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));
    throw ApiError.badRequest('Validation failed', formattedErrors);
  }
  next();
};

// ============================================
// AUTH VALIDATORS
// ============================================

const registerValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters (letters, numbers, underscores)'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('First name must be 1-100 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Last name must be 1-100 characters'),
  body('referralCode')
    .optional()
    .isLength({ min: 6, max: 20 })
    .withMessage('Invalid referral code'),
  validate,
];

const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  validate,
];

const resetPasswordValidator = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  validate,
];

// ============================================
// USER VALIDATORS
// ============================================

const updateProfileValidator = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('First name must be 1-100 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Last name must be 1-100 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number'),
  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters'),
  body('city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  body('timezone')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Invalid timezone'),
  body('language')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Invalid language code'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 10 })
    .withMessage('Invalid currency code'),
  validate,
];

// ============================================
// WALLET VALIDATORS
// ============================================

const depositValidator = [
  body('cryptocurrency')
    .notEmpty()
    .withMessage('Cryptocurrency is required'),
  body('network')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Invalid network'),
  validate,
];

const withdrawValidator = [
  body('cryptocurrency')
    .notEmpty()
    .withMessage('Cryptocurrency is required'),
  body('amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Invalid amount'),
  body('address')
    .notEmpty()
    .isLength({ min: 10, max: 255 })
    .withMessage('Invalid withdrawal address'),
  body('network')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Invalid network'),
  body('memo')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Memo must be less than 100 characters'),
  validate,
];

const transferValidator = [
  body('cryptocurrency')
    .notEmpty()
    .withMessage('Cryptocurrency is required'),
  body('amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Invalid amount'),
  body('fromWallet')
    .isIn(['spot', 'futures', 'earn'])
    .withMessage('Invalid source wallet'),
  body('toWallet')
    .isIn(['spot', 'futures', 'earn'])
    .withMessage('Invalid destination wallet'),
  validate,
];

// ============================================
// TRADING VALIDATORS
// ============================================

const createOrderValidator = [
  body('tradingPair')
    .notEmpty()
    .withMessage('Trading pair is required'),
  body('side')
    .isIn(['buy', 'sell'])
    .withMessage('Side must be buy or sell'),
  body('type')
    .isIn(['market', 'limit', 'stop_limit', 'stop_market'])
    .withMessage('Invalid order type'),
  body('quantity')
    .isFloat({ min: 0.00000001 })
    .withMessage('Invalid quantity'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Invalid price'),
  body('stopPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Invalid stop price'),
  body('timeInForce')
    .optional()
    .isIn(['GTC', 'IOC', 'FOK'])
    .withMessage('Invalid time in force'),
  validate,
];

const cancelOrderValidator = [
  param('orderId')
    .isUUID()
    .withMessage('Invalid order ID'),
  validate,
];

// ============================================
// STAKING VALIDATORS
// ============================================

const stakeValidator = [
  body('poolId')
    .isUUID()
    .withMessage('Invalid pool ID'),
  body('amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Invalid amount'),
  validate,
];

const unstakeValidator = [
  param('stakeId')
    .isUUID()
    .withMessage('Invalid stake ID'),
  validate,
];

// ============================================
// SUPPORT VALIDATORS
// ============================================

const createTicketValidator = [
  body('subject')
    .isLength({ min: 5, max: 255 })
    .withMessage('Subject must be 5-255 characters'),
  body('category')
    .isIn(['account', 'deposit', 'withdrawal', 'trading', 'technical', 'security', 'kyc', 'other'])
    .withMessage('Invalid category'),
  body('message')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be 10-5000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  validate,
];

const ticketMessageValidator = [
  param('ticketId')
    .isUUID()
    .withMessage('Invalid ticket ID'),
  body('message')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be 1-5000 characters'),
  validate,
];

// ============================================
// WATCHLIST VALIDATORS
// ============================================

const watchlistValidator = [
  body('cryptocurrencyId')
    .isUUID()
    .withMessage('Invalid cryptocurrency ID'),
  validate,
];

// ============================================
// PRICE ALERT VALIDATORS
// ============================================

const priceAlertValidator = [
  body('cryptocurrencyId')
    .isUUID()
    .withMessage('Invalid cryptocurrency ID'),
  body('condition')
    .isIn(['above', 'below', 'change_up', 'change_down'])
    .withMessage('Invalid condition'),
  body('targetPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Invalid target price'),
  body('changePercent')
    .optional()
    .isFloat({ min: -100, max: 1000 })
    .withMessage('Invalid change percent'),
  validate,
];

// ============================================
// API KEY VALIDATORS
// ============================================

const createApiKeyValidator = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  body('ipWhitelist')
    .optional()
    .isArray()
    .withMessage('IP whitelist must be an array'),
  validate,
];

// ============================================
// PAGINATION VALIDATORS
// ============================================

const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),
  query('order')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('Order must be asc or desc'),
  validate,
];

// ============================================
// UUID PARAM VALIDATOR
// ============================================

const uuidParamValidator = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName}`),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  changePasswordValidator,
  resetPasswordValidator,
  updateProfileValidator,
  depositValidator,
  withdrawValidator,
  transferValidator,
  createOrderValidator,
  cancelOrderValidator,
  stakeValidator,
  unstakeValidator,
  createTicketValidator,
  ticketMessageValidator,
  watchlistValidator,
  priceAlertValidator,
  createApiKeyValidator,
  paginationValidator,
  uuidParamValidator,
};
