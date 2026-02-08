const { ApiError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Convert non-ApiError errors to ApiError
 */
const convertError = (err, req, res, next) => {
  let error = err;

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
    error = new ApiError(422, 'Validation failed', errors);
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    error = new ApiError(409, `${field} already exists`);
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = new ApiError(400, 'Invalid reference');
  }

  // Sequelize database error
  if (err.name === 'SequelizeDatabaseError') {
    logger.error('Database error:', err);
    error = new ApiError(500, 'Database error');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Token expired');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ApiError(400, 'File too large');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ApiError(400, 'Unexpected file field');
  }

  // Default to ApiError if not already
  if (!(error instanceof ApiError)) {
    error = new ApiError(
      err.statusCode || 500,
      err.message || 'Internal server error',
      [],
      false
    );
  }

  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  const { statusCode, status, message, errors, isOperational } = err;

  // Log error
  if (!isOperational) {
    logger.error('Unexpected error:', err);
  } else if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, { stack: err.stack });
  } else {
    logger.warn(`${statusCode} - ${message}`);
  }

  // Send response
  const response = {
    success: false,
    status,
    message,
  };

  // Include errors array if present
  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (config.env === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  convertError,
  errorHandler,
  notFound,
  asyncHandler,
};
