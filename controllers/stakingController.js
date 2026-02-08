const stakingService = require('../services/stakingService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getPools = asyncHandler(async (req, res) => {
  const pools = await stakingService.getPools(req.query);
  ApiResponse.success(res, { pools });
});

exports.getPoolById = asyncHandler(async (req, res) => {
  const pool = await stakingService.getPoolById(req.params.id);
  ApiResponse.success(res, { pool });
});

exports.getUserPositions = asyncHandler(async (req, res) => {
  const positions = await stakingService.getUserPositions(req.user.id, req.query);
  ApiResponse.success(res, { positions });
});

exports.stake = asyncHandler(async (req, res) => {
  const { poolId, amount } = req.body;
  const position = await stakingService.stake(req.user.id, poolId, amount);
  ApiResponse.created(res, { position }, 'Staking successful');
});

exports.unstake = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const result = await stakingService.unstake(req.user.id, req.params.id, amount);
  ApiResponse.success(res, result, 'Unstaking successful');
});

exports.claimRewards = asyncHandler(async (req, res) => {
  const result = await stakingService.claimRewards(req.user.id, req.params.id);
  ApiResponse.success(res, result, 'Rewards claimed successfully');
});

exports.getUserStats = asyncHandler(async (req, res) => {
  const stats = await stakingService.getUserStats(req.user.id);
  ApiResponse.success(res, { statistics: stats });
});
