const { validationResult, body, param, query } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Handle validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    
    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
};

/**
 * Common validation rules
 */
const rules = {
  // Auth
  email: body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number'),

  confirm_password: body('confirmPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number')
    .custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),

  username: body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  // UUID
  uuid: (field, location = 'param') => {
    const validator = location === 'param' ? param(field) : 
                      location === 'query' ? query(field) : body(field);
    return validator.isUUID(4).withMessage(`Invalid ${field}`);
  },

  // Pagination
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  // Trading
  symbol: body('symbol')
    .trim()
    .toUpperCase()
    .notEmpty()
    .withMessage('Symbol is required'),

  side: body('side')
    .isIn(['buy', 'sell'])
    .withMessage('Side must be buy or sell'),

  orderType: body('type')
    .isIn(['market', 'limit', 'stop_limit', 'stop_market'])
    .withMessage('Invalid order type'),

  quantity: body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number')
    .toFloat(),

  price: body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .toFloat(),

  // Wallet
  currency: body('currency')
    .trim()
    .toUpperCase()
    .notEmpty()
    .withMessage('Currency is required'),
    symbol: body('symbol')
    .trim()
    .toUpperCase()
    .notEmpty()
    .withMessage('Symbol is required'),

  amount: body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  
  code: body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Code must be exactly 6 digits')
    .matches(/^\d{6}$/)
    .withMessage('Code must contain only digits')
    .trim(),

  pin: body('pin')
    .isLength({ min: 4, max: 4 })
    .withMessage('Code must be exactly 4 digits')
    .matches(/^\d{4}$/)
    .withMessage('Code must contain only digits')
    .trim(),
  
    confirm_pin: body('confirmPin')
    .isLength({ min: 4, max: 4 })
    .withMessage('Code must be exactly 4 digits')
    .matches(/^\d{4}$/)
    .withMessage('Code must contain only digits')
    .trim()
    .custom((value, { req }) => {
    if (value !== req.body.pin) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),

    

  address: body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),

  network: body('network')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Network is required'),

  // General
  string: (field, min = 1, max = 255) => 
    body(field)
      .trim()
      .isLength({ min, max })
      .withMessage(`${field} must be ${min}-${max} characters`),

  optionalString: (field, max = 255) =>
    body(field)
      .optional()
      .trim()
      .isLength({ max })
      .withMessage(`${field} cannot exceed ${max} characters`),

  boolean: (field) =>
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean`)
      .toBoolean(),

  number: (field, min, max) =>
    body(field)
      .isFloat({ min, max })
      .withMessage(`${field} must be a number${min !== undefined ? ` >= ${min}` : ''}${max !== undefined ? ` <= ${max}` : ''}`)
      .toFloat(),

  optionalNumber: (field, min, max) =>
    body(field)
      .optional()
      .isFloat({ min, max })
      .withMessage(`${field} must be a valid number`)
      .toFloat(),

  date: (field) =>
    body(field)
      .isISO8601()
      .withMessage(`${field} must be a valid date`)
      .toDate(),

  optionalDate: (field) =>
    body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid date`)
      .toDate(),

  enum: (field, values) =>
    body(field)
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`),

  optionalEnum: (field, values) =>
    body(field)
      .optional()
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`),

  array: (field) =>
    body(field)
      .isArray()
      .withMessage(`${field} must be an array`),

  optionalArray: (field) =>
    body(field)
      .optional()
      .isArray()
      .withMessage(`${field} must be an array`),
};

module.exports = {
  validate,
  rules,
  body,
  param,
  query,
};
