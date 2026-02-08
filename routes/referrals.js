const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authenticate } = require('../middleware/auth');
const { validate, query } = require('../middleware/validation');

router.get('/', authenticate, referralController.getReferralInfo);
router.get('/referrals', authenticate, [
  query('status').optional().isIn(['pending', 'active', 'inactive']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], validate, referralController.getReferrals);
router.get('/earnings', authenticate, referralController.getEarnings);
router.get('/earnings/summary', authenticate, [query('period').optional().isIn(['7d', '30d', '90d', '365d'])], validate, referralController.getEarningsSummary);
router.get('/leaderboard', [query('period').optional().isIn(['7d', '30d', '90d', 'all']), query('limit').optional().isInt({ min: 1, max: 100 }).toInt()], validate, referralController.getLeaderboard);

module.exports = router;
