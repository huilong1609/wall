const tradeService = require('../services/tradeService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getOverview = asyncHandler(async (req, res) => {
  const overview = await tradeService.getOverview(req.user.id);
  ApiResponse.success(res, overview );
})

exports.getTerminal = asyncHandler(async (req, res) => {
  const terminalData = await tradeService.getTerminalData(req.user.id);
  ApiResponse.success(res, terminalData );
})

exports.getMarketsByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const markets = await tradeService.getMarketsByType(type);
  ApiResponse.success(res, markets );
})
exports.createOrder = asyncHandler(async (req, res) => {
  const order = await tradeService.createOrder(req.user.id, req.body);
  ApiResponse.created(res, { order }, 'Order created successfully');
});

exports.getOrders = asyncHandler(async (req, res) => {
  const result = await tradeService.getOrders(req.user.id, req.query);
  ApiResponse.paginated(res, result.orders, result.pagination);
});

exports.getOpenOrders = asyncHandler(async (req, res) => {
  const { market, symbol } = req.query;
  const orders = await tradeService.getOpenOrders(req.user.id, market, symbol);
  ApiResponse.success(res, { orders });
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await tradeService.getOrderById(req.user.id, req.params.id);
  ApiResponse.success(res, { order });
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await tradeService.cancelOrder(req.user.id, req.params.id);
  ApiResponse.success(res, { order }, 'Order cancelled successfully');
});

exports.cancelAllOrders = asyncHandler(async (req, res) => {
  const { market, symbol } = req.query;
  const result = await tradeService.cancelAllOrders(req.user.id, market, symbol);
  ApiResponse.success(res, result, `${result.cancelled} orders cancelled`);
});

exports.getTrades = asyncHandler(async (req, res) => {
  const result = await tradeService.getTrades(req.user.id, req.query);
  ApiResponse.paginated(res, result.trades, result.pagination);
});

exports.getTradeById = asyncHandler(async (req, res) => {
  const trade = await tradeService.getTradeById(req.user.id, req.params.id);
  ApiResponse.success(res, { trade });
});

exports.getStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = await tradeService.getStatistics(req.user.id, startDate, endDate);
  ApiResponse.success(res, { statistics: stats });
});

exports.getProfitLoss = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const pnl = await tradeService.getProfitLoss(req.user.id, period);
  ApiResponse.success(res, { pnl });
});
