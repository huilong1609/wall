const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { validate, query, param } = require('../middleware/validation');

router.get('/', authenticate, [
  query('type').optional().isIn(['order','user', 'trade', 'deposit', 'withdrawal', 'transfer', 'price_alert', 'security', 'system', 'promo', 'referral', 'staking', 'copy_trade', 'verification', 'support']),
  query('read').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], validate, notificationController.getNotifications);

router.get('/get', authenticate, [
  query('type').optional().isIn(['order','user', 'trade', 'deposit', 'withdrawal', 'transfer', 'price_alert', 'security', 'system', 'promo', 'referral', 'staking', 'copy_trade', 'verification', 'support']),
  query('read').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], validate, notificationController.getNotifications);

router.get('/unread/count', authenticate, notificationController.getUnreadCount);
router.post('/create', authenticate, notificationController.createNotification);
router.get('/:id', authenticate, [param('id').isUUID()], validate, notificationController.getNotificationById);
router.put('/:id/read', authenticate, [param('id').isUUID()], validate, notificationController.markAsRead);
router.put('/read-all', authenticate, notificationController.markAllAsRead);
router.delete('/:id', authenticate, [param('id').isUUID()], validate, notificationController.deleteNotification);
router.delete('/', authenticate, notificationController.deleteAllNotifications);

module.exports = router;
