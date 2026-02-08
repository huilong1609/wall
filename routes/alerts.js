const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate } = require('../middleware/auth');
const { validate, rules, body, query, param } = require('../middleware/validation');

/**
 * @route   GET /api/v1/alerts
 * @desc    Get user price alerts
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  [
    query('symbol').optional().trim().toUpperCase(),
    query('status').optional().isIn(['active', 'triggered', 'expired', 'cancelled']),
    rules.page,
    rules.limit,
  ],
  validate,
  alertController.getAlerts
);

/**
 * @route   GET /api/v1/alerts/:id
 * @desc    Get price alert by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  alertController.getAlertById
);

/**
 * @route   POST /api/v1/alerts
 * @desc    Create price alert
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  [
    body('symbol').trim().toUpperCase().notEmpty(),
    body('condition').isIn(['above', 'below', 'crosses']),
    body('targetPrice').isFloat({ min: 0 }),
    body('note').optional().trim().isLength({ max: 500 }),
    body('channels').optional().isObject(),
    body('recurring').optional().isBoolean(),
    body('expiresAt').optional().isISO8601(),
  ],
  validate,
  alertController.createAlert
);

/**
 * @route   PUT /api/v1/alerts/:id
 * @desc    Update price alert
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id').isUUID(),
    body('targetPrice').optional().isFloat({ min: 0 }),
    body('condition').optional().isIn(['above', 'below', 'crosses']),
    body('note').optional().trim().isLength({ max: 500 }),
    body('channels').optional().isObject(),
    body('recurring').optional().isBoolean(),
    body('expiresAt').optional().isISO8601(),
  ],
  validate,
  alertController.updateAlert
);

/**
 * @route   DELETE /api/v1/alerts/:id
 * @desc    Delete price alert
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  alertController.deleteAlert
);

/**
 * @route   PUT /api/v1/alerts/:id/toggle
 * @desc    Toggle alert status
 * @access  Private
 */
router.put(
  '/:id/toggle',
  authenticate,
  [param('id').isUUID()],
  validate,
  alertController.toggleAlert
);

module.exports = router;
