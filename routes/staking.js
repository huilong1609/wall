const express = require('express');
const router = express.Router();
const stakingController = require('../controllers/stakingController');
const { authenticate } = require('../middleware/auth');
const { validate, body, query, param } = require('../middleware/validation');

router.get('/pools', [
  query('asset').optional().trim().toUpperCase(),
  query('type').optional().isIn(['flexible', 'locked']),
  query('status').optional().isIn(['active', 'inactive', 'ended']),
], validate, stakingController.getPools);

router.get('/pools/:id', [param('id').isUUID()], validate, stakingController.getPoolById);

router.get('/positions', authenticate, [
  query('status').optional().isIn(['active', 'unstaking', 'completed', 'cancelled']),
  query('asset').optional().trim().toUpperCase(),
], validate, stakingController.getUserPositions);

router.post('/stake', authenticate, [
  body('poolId').isUUID(),
  body('amount').isFloat({ min: 0 }),
], validate, stakingController.stake);

router.post('/unstake/:id', authenticate, [
  param('id').isUUID(),
  body('amount').optional().isFloat({ min: 0 }),
], validate, stakingController.unstake);

router.post('/claim/:id', authenticate, [param('id').isUUID()], validate, stakingController.claimRewards);

router.get('/stats', authenticate, stakingController.getUserStats);

module.exports = router;
