const copyTradingService = require('../services/copyTradingService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getTraders = asyncHandler(async (req, res) => {
  const result = await copyTradingService.getTraders(req.query);
  ApiResponse.paginated(res, {traders: result.traders , pagination: result.pagination, stats: result.stats}, result.pagination);
});

exports.getTraderProfile = asyncHandler(async (req, res) => {
  const profile = await copyTradingService.getTraderProfile(req.params.id);
  ApiResponse.success(res, { trader: profile });
});

exports.followTrader = asyncHandler(async (req, res) => {
  const relation = await copyTradingService.followTrader(req.user.id, req.params.id);
  ApiResponse.created(res, { relation }, 'Now following trader');
});

exports.myTraders = asyncHandler(async (req, res) => {
  const relation = await copyTradingService.myTraders(req.user.id);
  ApiResponse.created(res,  relation , 'Now following trader');
});

exports.unfollowTrader = asyncHandler(async (req, res) => {
  await copyTradingService.unfollowTrader(req.user.id, req.params.id);
  ApiResponse.success(res, null, 'Unfollowed trader');
});

exports.startCopying = asyncHandler(async (req, res) => {
  const relation = await copyTradingService.startCopying(req.user.id, req.params.id, req.body);
  ApiResponse.created(res, { relation }, 'Started copying trader');
});

exports.stopCopying = asyncHandler(async (req, res) => {
  const relation = await copyTradingService.stopCopying(req.user.id, req.params.id);
  ApiResponse.success(res, { relation }, 'Stopped copying trader');
});

exports.updateCopySettings = asyncHandler(async (req, res) => {
  const relation = await copyTradingService.updateCopySettings(req.user.id, req.params.id, req.body);
  ApiResponse.success(res, { relation }, 'Copy settings updated');
});

exports.toggleCopyStatus = asyncHandler(async (req, res) => {
  const relation = await copyTradingService.toggleCopyStatus(req.user.id, req.params.id);
  ApiResponse.success(res, { relation }, `Copying ${relation.status}`);
});

exports.getCopyPortfolio = asyncHandler(async (req, res) => {
  const portfolio = await copyTradingService.getCopyPortfolio(req.user.id);
  ApiResponse.success(res, { portfolio });
});

exports.getMyTraderProfile = asyncHandler(async (req, res) => {
  const profile = await copyTradingService.getTraderByUserId(req.user.id);
  ApiResponse.success(res, { profile });
});

exports.becomeTrader = asyncHandler(async (req, res) => {
  const profile = await copyTradingService.becomeTrader(req.user.id, req.body);
  ApiResponse.created(res, { profile }, 'Trader profile created');
});

exports.updateTraderProfile = asyncHandler(async (req, res) => {
  const profile = await copyTradingService.updateTraderProfile(req.user.id, req.body);
  ApiResponse.success(res, { profile }, 'Trader profile updated');
});
