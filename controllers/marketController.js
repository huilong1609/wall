const marketService = require('../services/marketService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getAssets = asyncHandler(async (req, res) => {
  const result = await marketService.getAssets(req.query);
  ApiResponse.paginated(res, result.assets, result.pagination);
});

exports.getAssetBySymbol = asyncHandler(async (req, res) => {
  const asset = await marketService.getAssetBySymbol(req.params.symbol);
  ApiResponse.success(res, { apiAsset: asset });
});

exports.getTradingPairs = asyncHandler(async (req, res) => {
  const result = await marketService.getTradingPairs(req.query);
  ApiResponse.paginated(res, result.pairs, result.pagination);
});

exports.getTradingPairBySymbol = asyncHandler(async (req, res) => {
  const { market } = req.query;
  const pair = await marketService.getTradingPairBySymbol(req.params.symbol, market);
  ApiResponse.success(res, { pair });
});

exports.getMarketOverview = asyncHandler(async (req, res) => {
  const overview = await marketService.getMarketOverview();
  ApiResponse.success(res, { overview });
});

exports.getTicker = asyncHandler(async (req, res) => {
  const ticker = await marketService.getTicker(req.params.symbol);
  ApiResponse.success(res, { ticker });
});

exports.getTickers = asyncHandler(async (req, res) => {
  const { market } = req.query;
  const tickers = await marketService.getAllTickers(market);
  ApiResponse.success(res, { tickers });
});

exports.getTickerBySymbol = asyncHandler(async (req, res) => {
  const ticker = await marketService.getTicker(req.params.symbol);
  ApiResponse.success(res, { ticker });
});

exports.getAllTickers = asyncHandler(async (req, res) => {
  const { market } = req.query;
  const tickers = await marketService.getAllTickers(market);
  ApiResponse.success(res, { tickers });
});

exports.getOrderbook = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const orderbook = await marketService.getOrderbook(req.params.symbol, limit);
  ApiResponse.success(res, { orderbook });
});

exports.getOrderBook = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const orderbook = await marketService.getOrderbook(req.params.symbol, limit);
  ApiResponse.success(res, { orderbook });
});

exports.getRecentTrades = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const trades = await marketService.getRecentTrades(req.params.symbol, limit);
  ApiResponse.success(res, { trades });
});

exports.getKlines = asyncHandler(async (req, res) => {
  const { interval, limit } = req.query;
  const klines = await marketService.getKlines(req.params.symbol, interval, limit);
  ApiResponse.success(res, { klines });
});

exports.getMarketStats = asyncHandler(async (req, res) => {
  const overview = await marketService.getMarketOverview();
  ApiResponse.success(res, { stats: overview });
});

exports.getTopGainers = asyncHandler(async (req, res) => {
  const overview = await marketService.getMarketOverview();
  ApiResponse.success(res, { gainers: overview.topGainers });
});

exports.getTopLosers = asyncHandler(async (req, res) => {
  const overview = await marketService.getMarketOverview();
  ApiResponse.success(res, { losers: overview.topLosers });
});

exports.getTopByVolume = asyncHandler(async (req, res) => {
  const overview = await marketService.getMarketOverview();
  ApiResponse.success(res, { topVolume: overview.topVolume });
});
