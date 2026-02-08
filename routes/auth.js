const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter, verificationLimiter } = require('../middleware/rateLimiter');
const { validate, rules, body } = require('../middleware/validation');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/start',
  authLimiter,
  [
    rules.email
  ],
  validate,
  authController.start
);
router.post(
  '/verify-otp',
  authLimiter,
  [
    rules.email,
    rules.code,
  ],
  validate,
  authController.verifyOTP
);
router.post(
  '/register-new',
  authLimiter,
  [
    rules.email,
    rules.password,
    rules.confirm_password,
    rules.pin,
    rules.confirm_pin,
    body('firstName').trim().isString().isLength({ max: 50 }),
    body('lastName').trim().isString().isLength({ max: 50 }),
    body('phone').trim().isString().isLength({ max: 50 }),
    body('country').trim().isString().isLength({ max: 50 }),
    body('currency').trim().isString().isLength({ max: 50 }),
    body('referralCode').optional().trim(),
  ],
  validate,
  authController.registerNew
);

router.post(
  '/register',
  authLimiter,
  [
    rules.email,
    rules.pin,
    rules.confirm_pin,
    body('firstName').optional().trim().isLength({ max: 50 }),
    body('lastName').optional().trim().isLength({ max: 50 }),
    body('referralCode').optional().trim(),
  ],
  validate,
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  [
    rules.email,
    body('password').notEmpty().withMessage('Password is required'),
    body('twoFactorCode').optional().isLength({ min: 6, max: 6 }),
  ],
  validate,
  authController.login
);

router.post(
  '/login-with-pin',
  authLimiter,
  [
    rules.email,
    rules.pin,
    body('twoFactorCode').optional().isLength({ min: 6, max: 6 }),
  ],
  validate,
  authController.loginWithPin
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Token is required')],
  validate,
  authController.verifyEmail
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post(
  '/resend-verification',
  verificationLimiter,
  [rules.email],
  validate,
  authController.resendVerification
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  [rules.email],
  validate,
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    rules.password,
  ],
  validate,
  authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    rules.password.withMessage('New password requirements not met'),
  ],
  validate,
  authController.changePassword
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   POST /api/v1/auth/2fa/setup
 * @desc    Setup 2FA
 * @access  Private
 */
router.post('/2fa/setup', authenticate, authController.setup2FA);

/**
 * @route   POST /api/v1/auth/2fa/enable
 * @desc    Enable 2FA
 * @access  Private
 */
router.post(
  '/2fa/enable',
  authenticate,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Invalid 2FA code')],
  validate,
  authController.enable2FA
);

/**
 * @route   POST /api/v1/auth/2fa/disable
 * @desc    Disable 2FA
 * @access  Private
 */
router.post(
  '/2fa/disable',
  authenticate,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Invalid 2FA code')],
  validate,
  authController.disable2FA
);

/**
 * @route   POST /api/v1/auth/2fa/verify
 * @desc    Verify 2FA code
 * @access  Private
 */
router.post(
  '/2fa/verify',
  authenticate,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Invalid 2FA code')],
  validate,
  authController.verify2FA
);

/**
 * @route   GET /api/v1/auth/2fa/backup-codes
 * @desc    Get backup codes
 * @access  Private
 */
router.get('/2fa/backup-codes', authenticate, authController.getBackupCodes);

/**
 * @route   POST /api/v1/auth/2fa/regenerate-backup-codes
 * @desc    Regenerate backup codes
 * @access  Private
 */
router.post('/2fa/regenerate-backup-codes', authenticate, authController.regenerateBackupCodes);

module.exports = router;
