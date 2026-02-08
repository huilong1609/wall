const dashboardService = require('../services/dashboardService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get dashboard overview
 * GET /api/v1/dashboard
 */
exports.getOverview = asyncHandler(async (req, res) => {
  const overview = await dashboardService.getOverview(req.user.id);
  ApiResponse.success(res, { overview });
});

/**
 * Get portfolio summary
 * GET /api/v1/dashboard/portfolio
 */
exports.getPortfolio = asyncHandler(async (req, res) => {
  const portfolio = await dashboardService.getPortfolio(req.user.id);
  ApiResponse.success(res, { portfolio });
});

/**
 * Get trading statistics
 * GET /api/v1/dashboard/trading-stats
 */
exports.getTradingStats = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const stats = await dashboardService.getTradingStats(req.user.id, period);
  ApiResponse.success(res, { statistics: stats });
});

/**
 * Get account activity
 * GET /api/v1/dashboard/activity
 */
exports.getActivity = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await dashboardService.getActivity(req.user.id, page, limit);
  ApiResponse.paginated(res, result.activities, result.pagination);
});

/**
 * Get P&L chart data
 * GET /api/v1/dashboard/pnl-chart
 */
exports.getPnLChart = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const chartData = await dashboardService.getPnLChart(req.user.id, period);
  ApiResponse.success(res, { chartData });
});

/**
 * Get balance history chart
 * GET /api/v1/dashboard/balance-chart
 */
exports.getBalanceChart = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const chartData = await dashboardService.getBalanceChart(req.user.id, period);
  ApiResponse.success(res, { chartData });
});

/**
 * Get quick stats widgets
 * GET /api/v1/dashboard/quick-stats
 */
exports.getQuickStats = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getQuickStats(req.user.id);
  ApiResponse.success(res, { stats });
});

/**
 * Get recent notifications
 * GET /api/v1/dashboard/notifications
 */
exports.getRecentNotifications = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const notifications = await dashboardService.getRecentNotifications(req.user.id, limit);
  ApiResponse.success(res, { notifications });
});

/**
 * Get market overview
 * GET /api/v1/dashboard/market-overview
 */
exports.getMarketOverview = asyncHandler(async (req, res) => {
  const marketOverview = await dashboardService.getMarketOverview();
  ApiResponse.success(res, { market: marketOverview });
});

/**
 * Get all dashboard data in one call
 * GET /api/v1/dashboard/all
 */
exports.getAllDashboardData = asyncHandler(async (req, res) => {
  const [overview, portfolio, quickStats, marketOverview, notifications] = await Promise.all([
    dashboardService.getOverview(req.user.id),
    dashboardService.getPortfolio(req.user.id),
    dashboardService.getQuickStats(req.user.id),
    dashboardService.getMarketOverview(),
    dashboardService.getRecentNotifications(req.user.id, 5),
  ]);

  ApiResponse.success(res, {
    overview,
    portfolio,
    quickStats,
    marketOverview,
    notifications,
  });
});
