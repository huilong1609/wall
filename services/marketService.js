const { Op } = require('sequelize');
const { Asset, TradingPair, Coin } = require('../models');
const { NotFoundError } = require('../utils/errors');

class MarketService {

  /**
   * Get all assets
   */
  async getAssets(filters = {}) {
  const { type, status, search, page = 1, limit = 50 } = filters;

  // Default status = true unless explicitly provided
  const resolvedStatus = typeof status !== 'undefined' ? status : true;

  // WHERE for Asset
  //const assetWhere = { status: resolvedStatus };
  const assetWhere = {};
  if (type) assetWhere.type = type;

  if (search) {
    assetWhere[Op.or] = [
      { symbol: { [Op.iLike]: `%${search}%` } },
      { name: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // WHERE for Coin
  const coinWhere = { status: resolvedStatus };

  if (search) {
    coinWhere[Op.or] = [
      { symbol: { [Op.iLike]: `%${search}%` } },
      { name: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const [assets, coins] = await Promise.all([
    Asset.findAll({ where: assetWhere }),
    Coin.findAll({ where: coinWhere }),
  ]);

  const mappedAssets = assets.map(a => ({
    id: a.id,
    name: a.name,
    symbol: a.symbol,
    price: a.rate?.price ?? null,
    decimal: a.decimals,
    type: a.type,
    logo: a.icon,
    change24h: a.rate?.change24h ?? 0,
    low24h: a.rate?.low24h ?? 0,
    high24h: a.rate?.high24h ?? 0,
  }));

  const mappedCoins = coins.map(c => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    price: c.rate?.price ?? null,
    decimal: c.digits,
    type: 'crypto',
    logo: c.logo,
    change24h: c.rate?.change24h ?? 0,
    low24h: c.rate?.low24h ?? 0,
    high24h: c.rate?.high24h ?? 0,
  }));

  const allAssetsSorted = [...mappedCoins, ...mappedAssets].sort((a, b) => {
    const nameA = (a.name ?? '').toUpperCase();
    const nameB = (b.name ?? '').toUpperCase();
    return nameA.localeCompare(nameB);
  });

  const count = allAssetsSorted.length;
  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit);

  return {
    assets: allAssetsSorted,
    pagination: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
}


  /**
   * Get asset by symbol
   */
  async getAssetBySymbol(symbol) {
    const asset = await Asset.findOne({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    return asset;
  }

  /**
   * Get all trading pairs
   */
  async getTradingPairs(filters = {}) {
    const { market, quoteAsset, status, search, page = 1, limit = 50 } = filters;

    const where = {};
    if (market) where.market = market;
    if (quoteAsset) where.quoteAsset = quoteAsset.toUpperCase();
    if (status) where.status = status;
    if (search) {
      where.symbol = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await TradingPair.findAndCountAll({
      where,
      order: [['isFeatured', 'DESC'], ['volume24h', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      pairs: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  /**
   * Get trading pair by symbol
   */
  async getTradingPairBySymbol(symbol, market = null) {
    const where = { symbol: symbol.toUpperCase() };
    if (market) where.market = market;

    const pair = await TradingPair.findOne({ where });

    if (!pair) {
      throw new NotFoundError('Trading pair not found');
    }

    return pair;
  }

  /**
   * Get market overview
   */
  async getMarketOverview() {
    const [totalAssets, totalPairs, activePairs] = await Promise.all([
      Asset.count({ where: { status: 'active' } }),
      TradingPair.count(),
      TradingPair.count({ where: { status: 'active', tradingEnabled: true } }),
    ]);

    const topGainers = await TradingPair.findAll({
      where: { status: 'active' },
      order: [['priceChangePercent24h', 'DESC']],
      limit: 5,
    });

    const topLosers = await TradingPair.findAll({
      where: { status: 'active' },
      order: [['priceChangePercent24h', 'ASC']],
      limit: 5,
    });

    const topVolume = await TradingPair.findAll({
      where: { status: 'active' },
      order: [['volume24h', 'DESC']],
      limit: 5,
    });

    return {
      totalAssets,
      totalPairs,
      activePairs,
      topGainers,
      topLosers,
      topVolume,
    };
  }

  /**
   * Get ticker data
   */
  async getTicker(symbol) {
    const pair = await this.getTradingPairBySymbol(symbol);

    return {
      symbol: pair.symbol,
      price: pair.price,
      bidPrice: pair.bidPrice,
      askPrice: pair.askPrice,
      priceChange24h: pair.priceChange24h,
      priceChangePercent24h: pair.priceChangePercent24h,
      high24h: pair.high24h,
      low24h: pair.low24h,
      volume24h: pair.volume24h,
      quoteVolume24h: pair.quoteVolume24h,
      updatedAt: pair.priceUpdatedAt,
    };
  }

  /**
   * Get all tickers
   */
  async getAllTickers(market = null) {
    const where = { status: 'active' };
    if (market) where.market = market;

    const pairs = await TradingPair.findAll({
      where,
      attributes: [
        'symbol', 'price', 'bidPrice', 'askPrice',
        'priceChange24h', 'priceChangePercent24h',
        'high24h', 'low24h', 'volume24h', 'quoteVolume24h',
      ],
    });

    return pairs;
  }

  /**
   * Get orderbook (mock data)
   */
  async getOrderbook(symbol, limit = 20) {
    const pair = await this.getTradingPairBySymbol(symbol);
    const price = parseFloat(pair.price);

    // Generate mock orderbook
    const bids = [];
    const asks = [];

    for (let i = 0; i < limit; i++) {
      const bidPrice = price * (1 - (i + 1) * 0.001);
      const askPrice = price * (1 + (i + 1) * 0.001);
      const quantity = Math.random() * 10;

      bids.push({ price: bidPrice.toFixed(8), quantity: quantity.toFixed(8) });
      asks.push({ price: askPrice.toFixed(8), quantity: quantity.toFixed(8) });
    }

    return { symbol, bids, asks, timestamp: Date.now() };
  }

  /**
   * Get recent trades (mock data)
   */
  async getRecentTrades(symbol, limit = 50) {
    const pair = await this.getTradingPairBySymbol(symbol);
    const price = parseFloat(pair.price);

    const trades = [];
    const now = Date.now();

    for (let i = 0; i < limit; i++) {
      trades.push({
        id: `${now}-${i}`,
        price: (price * (1 + (Math.random() - 0.5) * 0.01)).toFixed(8),
        quantity: (Math.random() * 5).toFixed(8),
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: now - i * 1000,
      });
    }

    return trades;
  }

  /**
   * Get candlestick data (mock data)
   */
  async getKlines(symbol, interval = '1h', limit = 100) {
    const pair = await this.getTradingPairBySymbol(symbol);
    const price = parseFloat(pair.price);

    const intervals = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };

    const intervalMs = intervals[interval] || intervals['1h'];
    const now = Date.now();
    const klines = [];

    let currentPrice = price * 0.9;

    for (let i = limit - 1; i >= 0; i--) {
      const open = currentPrice;
      const change = (Math.random() - 0.48) * 0.02;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1000;

      klines.push({
        openTime: now - i * intervalMs,
        open: open.toFixed(8),
        high: high.toFixed(8),
        low: low.toFixed(8),
        close: close.toFixed(8),
        volume: volume.toFixed(8),
        closeTime: now - i * intervalMs + intervalMs - 1,
      });

      currentPrice = close;
    }

    return klines;
  }
}

module.exports = new MarketService();
