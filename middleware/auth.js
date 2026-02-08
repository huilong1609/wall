const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Session, ApiKey } = require('../models');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Authenticate user via JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Access denied. No token provided.');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Check if user exists
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User not found.');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new ForbiddenError('Account is not active.');
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      throw new UnauthorizedError('Password recently changed. Please log in again.');
    }

    // Verify session is still valid
    if (decoded.sessionId) {
      const session = await Session.findByPk(decoded.sessionId);
      if (!session || !session.isActive) {
        throw new UnauthorizedError('Session expired. Please log in again.');
      }
      // Update session activity
      await session.updateActivity();
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    req.sessionId = decoded.sessionId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired.'));
    }
    next(error);
  }
};

/**
 * Authenticate via API key
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    if (!apiKey) {
      throw new UnauthorizedError('API key required.');
    }

    // Find API key
    const key = await ApiKey.findOne({
      where: { key: apiKey, status: 'active' },
      include: [{ model: User, as: 'user' }],
    });

    if (!key) {
      throw new UnauthorizedError('Invalid API key.');
    }

    // Check if expired
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new UnauthorizedError('API key expired.');
    }

    // Verify IP restriction
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!key.isIpAllowed(clientIp)) {
      throw new ForbiddenError('IP address not allowed.');
    }

    // Update usage
    await key.updateUsage(clientIp);

    // Attach to request
    req.user = key.user;
    req.apiKey = key;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has required role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions.'));
    }

    next();
  };
};

/**
 * Check if user has required permission (for API keys)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.apiKey && !req.apiKey.hasPermission(permission)) {
      return next(new ForbiddenError(`API key lacks '${permission}' permission.`));
    }
    next();
  };
};

/**
 * Check if user has KYC verification level
 */
const requireKyc = (level = 'level1') => {
  const levels = ['none', 'pending', 'level1', 'level2', 'level3', 'level4'];
  const requiredIndex = levels.indexOf(level);

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    const userIndex = levels.indexOf(req.user.kycStatus);
    if (userIndex < requiredIndex) {
      return next(new ForbiddenError(`KYC ${level} verification required.`));
    }

    next();
  };
};

/**
 * Check if 2FA is enabled and verified
 */
const require2FA = async (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.'));
  }

  if (req.user.twoFactorEnabled && !req.session?.twoFactorVerified) {
    return next(new ForbiddenError('Two-factor authentication required.'));
  }

  next();
};

/**
 * Optional authentication (attach user if token present)
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findByPk(decoded.id);
      if (user && user.status === 'active') {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Silent fail - user just won't be attached
    next();
  }
};

module.exports = {
  authenticate,
  authenticateApiKey,
  requireRole,
  requirePermission,
  requireKyc,
  require2FA,
  optionalAuth,
};
