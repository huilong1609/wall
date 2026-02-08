const express = require('express');
const router = express.Router();
const copyTradingController = require('../controllers/copyTradingController');
const { authenticate } = require('../middleware/auth');
const { validate, body, query, param } = require('../middleware/validation');

router.get('/traders', copyTradingController.getTraders);
router.get('/my-traders', authenticate, copyTradingController.myTraders);
router.get('/traders/:id', [param('id').isUUID()], validate, copyTradingController.getTraderProfile);
router.post('/traders/:id/follow', authenticate, [param('id').isUUID()], validate, copyTradingController.followTrader);
router.delete('/traders/:id/follow', authenticate, [param('id').isUUID()], validate, copyTradingController.unfollowTrader);
router.post('/traders/:id/copy', authenticate, [param('id').isUUID(), body('copyAmount').isFloat({ min: 0 })], validate, copyTradingController.startCopying);
router.delete('/relations/:id', authenticate, [param('id').isUUID()], validate, copyTradingController.stopCopying);
router.put('/relations/:id', authenticate, [param('id').isUUID()], validate, copyTradingController.updateCopySettings);
router.put('/relations/:id/toggle', authenticate, [param('id').isUUID()], validate, copyTradingController.toggleCopyStatus);
router.get('/portfolio', authenticate, copyTradingController.getCopyPortfolio);
router.get('/my-profile', authenticate, copyTradingController.getMyTraderProfile);
router.post('/become-trader', authenticate, [body('displayName').trim().notEmpty()], validate, copyTradingController.becomeTrader);
router.put('/my-profile', authenticate, copyTradingController.updateTraderProfile);


module.exports = router;
