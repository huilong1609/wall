const planService = require('../services/planService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getPlans = asyncHandler(async (req, res) => {
  const plans = await planService.getPlans();
  ApiResponse.success(res, plans);
});

exports.getPlanById = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const plan = await planService.getPlanById(planId);
  if (!plan) {
    return ApiResponse.notFound(res, 'Plan not found');
  }
  ApiResponse.success(res, { plan });
});

exports.subscribeToPlan = asyncHandler(async (req, res) => {   
   
    const subscription = await planService.subscribeToPlan(req.user.id, req.body);
    ApiResponse.success(res, { subscription } , 'Subscribed to plan successfully');
 })

 exports.getUserSubscriptions = asyncHandler(async (req, res) => {
    const subscriptions = await planService.getUserSubscriptions(req.user.id);
    ApiResponse.success(res, subscriptions );
 })

exports.getCoupons = asyncHandler(async (req, res) => {
  const coupons = await planService.getCoupons();
  ApiResponse.success(res, { coupons });
});

exports.checkCoupon = asyncHandler(async (req, res) => {
  const { coupon, planId } = req.body;
  const coupons = await planService.checkCoupon(coupon , planId);
  ApiResponse.success(res, coupons);
});

exports.getCouponById = asyncHandler(async (req, res) => {
  const { couponId } = req.params;
  const coupon = await planService.getCouponById(couponId);
    if (!coupon) {
        return ApiResponse.notFound(res, 'Coupon not found');
    }
  ApiResponse.success(res, { coupon });
});