const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireRole, requireKyc } = require('../middleware/auth');
const { validate, rules, body } = require('../middleware/validation');

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().trim().isLength({ max: 50 }),
    body('lastName').optional().trim().isLength({ max: 50 }),
    body('phone').optional().trim(),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('country').optional().trim(),
    body('city').optional().trim(),
    body('timezone').optional().trim(),
    body('language').optional().isIn(['en', 'es', 'fr', 'de', 'zh', 'ja']),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'JPY', 'CNY']),
    body('dateFormat').optional().isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  ],
  validate,
  userController.updateProfile
);

/**
 * @route   POST /api/v1/users/profile/avatar
 * @desc    Upload avatar
 * @access  Private
 */
router.post('/profile/avatar', authenticate, userController.uploadAvatar);

/**
 * @route   DELETE /api/v1/users/profile/avatar
 * @desc    Delete avatar
 * @access  Private
 */
router.delete('/profile/avatar', authenticate, userController.deleteAvatar);

/**
 * @route   GET /api/v1/users/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/settings', authenticate, userController.getSettings);

/**
 * @route   PUT /api/v1/users/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/settings', authenticate, userController.updateSettings);

/**
 * @route   GET /api/v1/users/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/notifications/preferences', authenticate, userController.getNotificationPreferences);

/**
 * @route   PUT /api/v1/users/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  '/notifications/preferences',
  authenticate,
  [body('preferences').isObject().withMessage('Preferences must be an object')],
  validate,
  userController.updateNotificationPreferences
);

/**
 * @route   GET /api/v1/users/security
 * @desc    Get security settings
 * @access  Private
 */
router.get('/security', authenticate, userController.getSecuritySettings);

/**
 * @route   PUT /api/v1/users/security
 * @desc    Update security settings
 * @access  Private
 */
router.put(
  '/security',
  authenticate,
  [
    body('antiPhishingCode').optional().trim().isLength({ max: 50 }),
    body('withdrawalWhitelist').optional().isBoolean(),
    body('loginNotifications').optional().isBoolean(),
  ],
  validate,
  userController.updateSecuritySettings
);

/**
 * @route   GET /api/v1/users/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions', authenticate, userController.getSessions);

/**
 * @route   DELETE /api/v1/users/sessions/:sessionId
 * @desc    Revoke a session
 * @access  Private
 */
router.delete('/sessions/:sessionId', authenticate, userController.revokeSession);

/**
 * @route   GET /api/v1/users/login-history
 * @desc    Get login history
 * @access  Private
 */
router.get('/login-history', authenticate, userController.getLoginHistory);

/**
 * @route   GET /api/v1/users/activity
 * @desc    Get account activity
 * @access  Private
 */
router.get('/activity', authenticate, userController.getActivity);

/**
 * @route   POST /api/v1/users/verify-phone
 * @desc    Send phone verification code
 * @access  Private
 */
router.post(
  '/verify-phone/send',
  authenticate,
  [body('phone').notEmpty().withMessage('Phone number is required')],
  validate,
  userController.sendPhoneVerification
);

/**
 * @route   POST /api/v1/users/verify-phone/confirm
 * @desc    Confirm phone verification
 * @access  Private
 */
router.post(
  '/verify-phone/confirm',
  authenticate,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Invalid verification code')],
  validate,
  userController.confirmPhoneVerification
);

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete account
 * @access  Private
 */
router.delete(
  '/account',
  authenticate,
  [body('password').notEmpty().withMessage('Password is required')],
  validate,
  userController.deleteAccount
);

/**
 * @route   GET /api/v1/users/export
 * @desc    Export user data
 * @access  Private
 */
router.get('/export', authenticate, userController.exportData);

module.exports = router;
