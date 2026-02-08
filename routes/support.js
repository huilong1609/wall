const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticate } = require('../middleware/auth');
const { validate, body, query, param } = require('../middleware/validation');

router.get('/tickets', authenticate, [
  query('category').optional().isIn(['account', 'trading', 'deposit', 'withdrawal', 'verification', 'security', 'technical', 'other']),
  query('status').optional().isIn(['open', 'pending', 'in_progress', 'resolved', 'closed']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], validate, supportController.getTickets);

router.get('/tickets/:id', authenticate, [param('id').isUUID()], validate, supportController.getTicketById);

router.post('/tickets', authenticate, [
  body('category').isIn(['account', 'trading', 'deposit', 'withdrawal', 'verification', 'security', 'technical', 'other']),
  body('subject').trim().isLength({ min: 5, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 5000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
], validate, supportController.createTicket);

router.post('/tickets/:id/reply', authenticate, [
  param('id').isUUID(),
  body('message').trim().isLength({ min: 1, max: 5000 }),
], validate, supportController.replyToTicket);

router.put('/tickets/:id/close', authenticate, [param('id').isUUID()], validate, supportController.closeTicket);
router.put('/tickets/:id/reopen', authenticate, [param('id').isUUID()], validate, supportController.reopenTicket);

router.post('/tickets/:id/rate', authenticate, [
  param('id').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 500 }),
], validate, supportController.rateTicket);

router.get('/faq/categories', supportController.getFAQCategories);
router.get('/faq/search', [query('q').optional().trim()], validate, supportController.searchFAQ);
router.get('/stats', authenticate, supportController.getTicketStats);

module.exports = router;
