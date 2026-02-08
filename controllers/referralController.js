const referralService = require('../services/referralService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getReferralInfo = asyncHandler(async (req, res) => {
  const info = await referralService.getReferralInfo(req.user.id);
  ApiResponse.success(res, { referral: info });
});

exports.getReferrals = asyncHandler(async (req, res) => {
  const result = await referralService.getReferrals(req.user.id, req.query);
  ApiResponse.paginated(res, result.referrals, result.pagination);
});

exports.getEarnings = asyncHandler(async (req, res) => {
  const result = await referralService.getEarnings(req.user.id, req.query);
  ApiResponse.paginated(res, result.earnings, result.pagination);
});

exports.getEarningsSummary = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const summary = await referralService.getEarningsSummary(req.user.id, period);
  ApiResponse.success(res, { summary });
});

exports.getLeaderboard = asyncHandler(async (req, res) => {
  const { period, limit } = req.query;
  const leaderboard = await referralService.getLeaderboard(period, limit);
  ApiResponse.success(res, { leaderboard });
});
