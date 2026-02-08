const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { authenticate } = require('../middleware/auth');
const { validate, body, query, param } = require('../middleware/validation');

/**
 * @route   GET /api/v1/api-keys
 * @desc    Get user API keys
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  [query('status').optional().isIn(['active', 'inactive', 'revoked'])],
  apiKeyController.getApiKeys
);

/**
 * @route   GET /api/v1/api-keys/:id
 * @desc    Get API key by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  apiKeyController.getApiKeyById
);

/**
 * @route   POST /api/v1/api-keys
 * @desc    Create new API key
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('permissions').optional().isObject(),
    body('permissions.read').optional().isBoolean(),
    body('permissions.trade').optional().isBoolean(),
    body('permissions.withdraw').optional().isBoolean(),
    body('ipRestrictions').optional().isArray(),
    body('expiresAt').optional().isISO8601(),
    body('twoFactorCode').optional().isLength({ min: 6, max: 6 }),
  ],
  validate,
  apiKeyController.createApiKey
);

/**
 * @route   PUT /api/v1/api-keys/:id
 * @desc    Update API key
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('permissions').optional().isObject(),
    body('ipRestrictions').optional().isArray(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validate,
  apiKeyController.updateApiKey
);

/**
 * @route   DELETE /api/v1/api-keys/:id
 * @desc    Delete/revoke API key
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  apiKeyController.deleteApiKey
);

/**
 * @route   DELETE /api/v1/api-keys
 * @desc    Revoke all API keys
 * @access  Private
 */
router.delete('/', authenticate, apiKeyController.revokeAllApiKeys);

module.exports = router;
