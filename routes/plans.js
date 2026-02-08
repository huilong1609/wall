const express = require('express');
const router = express.Router();
const plansController = require('../controllers/planController');
const { authenticate } = require('../middleware/auth');
const { validate, rules, body } = require('../middleware/validation');

router.get('/', authenticate, plansController.getPlans);
router.post('/subscribe', authenticate, plansController.subscribeToPlan);
router.get('/subscriptions', authenticate, plansController.getUserSubscriptions);
router.post('/coupon/check',
    authenticate,
    [
        body('coupon').trim().isString().isLength({ max: 50 }),
        body('amount').optional().isNumeric(),
        body('planId').isString()
    ],
    validate,
    plansController.checkCoupon);
/* router.get('/coupons/:couponId', authenticate, plansController.getCouponById);

router.get('/:planId', authenticate, plansController.getPlanById);
router.post('/', authenticate, plansController.createPlan);
router.put('/:planId', authenticate, plansController.updatePlan);
router.delete('/:planId', authenticate, plansController.deletePlan); */

module.exports = router;