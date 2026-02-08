const { Op } = require('sequelize');
const { sequelize, Order, Trade, Wallet, TradingPair, User, Transaction } = require('../models');
const { generateOrderId, generateTransactionId } = require('../utils/helpers');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');

class TradeService {

  async getOverview(userId) {
    const recentTrades = [
      { pair: 'BTC/USDT', type: 'buy', price: 43567.82, amount: 0.0234, time: '12:45:32' },
      { pair: 'ETH/USDT', type: 'sell', price: 2284.56, amount: 1.5, time: '12:44:18' },
      { pair: 'SOL/USDT', type: 'buy', price: 98.76, amount: 12.5, time: '12:42:05' },
      { pair: 'BNB/USDT', type: 'buy', price: 312.45, amount: 2.3, time: '12:40:55' },
    ];


    // Market stats
    const marketStats = [
      { label: 'Total Trades', value: '$48.2B', change: '+12.5%', positive: true },
      { label: 'Total Profit', value: '1.2M', change: '+8.7%', positive: true },
      { label: 'Trades Today', value: '4.5M', change: '-2.1%', positive: false },
      { label: 'My Traders', value: '$12.8B', change: '', positive: true },
    ];
    return {
      recentTrades,
      marketStats,
    };
  }

  async getTerminalData(userId) {
    const [tradingPair] = await Promise.all([
    TradingPair.findAll({
      where: { status: 'active' },
      attributes: ['symbol', 'baseAsset', 'quoteAsset', 'price', 'priceChange24h', 'volume24h'],
    }),
  ]);

  const orderBook = (currentAsk, currentBid) => {
    const asks = [];
    const bids = [];
    let askPrice = currentAsk;
    let bidPrice = currentBid;
    
    for (let i = 0; i < 12; i++) {
      asks.push({
        price: askPrice.toFixed(5),
        volume: (Math.random() * 50 + 10).toFixed(2),
        total: (Math.random() * 500000).toFixed(0),
      });
      bids.push({
        price: bidPrice.toFixed(5),
        volume: (Math.random() * 50 + 10).toFixed(2),
        total: (Math.random() * 500000).toFixed(0),
      });
      askPrice += Math.random() * 0.0003 + 0.0001;
      bidPrice -= Math.random() * 0.0003 + 0.0001;
    }
    return { asks: asks.reverse(), bids };
  };
  
  
  const recentTrades = (currentBid) => {
    const trades = [];
    for (let i = 0; i < 15; i++) {
      trades.push({
        price: (currentBid + (Math.random() - 0.5) * 0.001).toFixed(5),
        volume: (Math.random() * 10 + 0.5).toFixed(2),
        time: `${12 + Math.floor(i / 5)}:${(45 - i * 3).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        type: Math.random() > 0.5 ? 'buy' : 'sell',
      });
    }
    return trades;
  };
  
    const openPositions = [
    { id: 1, pair: 'EUR/USD', type: 'buy', lots: 0.10, entryPrice: 1.0850, currentPrice: 1.0874, pnl: 24.00, pnlPercent: 0.22, swap: -1.25, time: '2024-01-15 12:30' },
    { id: 2, pair: 'GBP/USD', type: 'sell', lots: 0.05, entryPrice: 1.2720, currentPrice: 1.2695, pnl: 12.50, pnlPercent: 0.20, swap: -0.85, time: '2024-01-15 11:20' },
  ];

    return { tradingPair, recentTrades: recentTrades(1.0840) , openPositions , orderBook: orderBook(1.0874 ,1.2695 )  };
  }

  

  async getMarketsByType(type) {
    const validTypes = ['spot', 'futures', 'margin', 'forex', 'stocks'];
    if (!validTypes.includes(type)) {
      throw new BadRequestError('Invalid market type');
    }


    const recentTrades = (currentPrice) => {
      const trades = [];
      for (let i = 0; i < 15; i++) {
        trades.push({
          symbol: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'][i % 5],
          price: (currentPrice + (Math.random() - 0.5) * 50).toFixed(2),
          amount: (Math.random() * 0.5).toFixed(4),
          time: `${12 + Math.floor(i / 5)}:${(45 - i * 3).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          type: Math.random() > 0.5 ? 'buy' : 'sell',
        });
      }
      return trades;
    };

    const orderBook = (currentPrice) => {
      const asks = [];
      const bids = [];
      let askPrice = currentPrice + 5;
      let bidPrice = currentPrice - 5;

      for (let i = 0; i < 12; i++) {
        asks.push({
          price: askPrice.toFixed(2),
          amount: (Math.random() * 2).toFixed(4),
          total: (Math.random() * 50000).toFixed(2),
        });
        bids.push({
          price: bidPrice.toFixed(2),
          amount: (Math.random() * 2).toFixed(4),
          total: (Math.random() * 50000).toFixed(2),
        });
        askPrice += Math.random() * 10 + 2;
        bidPrice -= Math.random() * 10 + 2;
      }
      return { asks: asks.reverse(), bids };
    };
    // Open orders
    const openOrders = [
      { id: 1, pair: 'BTC/USDT', type: 'buy', orderType: 'Limit', price: 42500, amount: 0.05, filled: 0, total: 2125, time: '2024-01-15 12:30:45' },
      { id: 2, pair: 'BTC/USDT', type: 'sell', orderType: 'Limit', price: 45000, amount: 0.1, filled: 0.02, total: 4500, time: '2024-01-15 11:20:15' },
    ];

    // Trading pairs
    const tradingPairs = [
      {
        pair: 'BTC_USDT', price: 43567.82, stats: {
          price: 43567.82,
          change: 2.45,
          high24h: 44123.45,
          low24h: 42890.12,
          volume24h: '28.5B',
        }, change: 2.45
      },
      { pair: 'ETH_USDT', price: 2284.56, change: 4.32 },
      { pair: 'BNB_USDT', price: 312.45, change: -1.23 },
      { pair: 'SOL_USDT', price: 98.76, change: 5.67 },
      { pair: 'XRP_USDT', price: 0.5234, change: 1.89 },
      { pair: 'ADA_USDT', price: 0.4567, change: -2.11 },
    ];
    return { recentTrades: recentTrades(43567.82), orderBook: orderBook(43567.82), openOrders, tradingPairs };

    const markets = await TradingPair.findAll({
      where: { market: type, status: 'active' },
      attributes: ['symbol', 'baseAsset', 'quoteAsset', 'price', 'change24h', 'volume24h'],
    });

    return markets;
  }
  /**
   * Create a new order
   */
  async createOrder(userId, orderData) {
    const {
      market, symbol, side, type, quantity, price,
      stopPrice, leverage = 1, takeProfit, stopLoss,
      timeInForce = 'GTC', reduceOnly = false, postOnly = false,
      clientOrderId,
    } = orderData;

    // Get trading pair
    const tradingPair = await TradingPair.findOne({
      where: { symbol, market, status: 'active' },
    });

    if (!tradingPair) {
      throw new BadRequestError('Trading pair not found or inactive');
    }

    if (!tradingPair.tradingEnabled) {
      throw new BadRequestError('Trading is disabled for this pair');
    }

    // Validate quantity
    if (quantity < parseFloat(tradingPair.minQuantity)) {
      throw new BadRequestError(`Minimum quantity is ${tradingPair.minQuantity}`);
    }

    if (tradingPair.maxQuantity && quantity > parseFloat(tradingPair.maxQuantity)) {
      throw new BadRequestError(`Maximum quantity is ${tradingPair.maxQuantity}`);
    }

    // Validate leverage for futures
    if (market === 'futures' && leverage > tradingPair.maxLeverage) {
      throw new BadRequestError(`Maximum leverage is ${tradingPair.maxLeverage}x`);
    }

    // Calculate order value
    const orderPrice = type === 'market' ? parseFloat(tradingPair.price) : price;
    const orderValue = quantity * orderPrice;

    // Check minimum notional
    if (orderValue < parseFloat(tradingPair.minNotional)) {
      throw new BadRequestError(`Minimum order value is ${tradingPair.minNotional} ${tradingPair.quoteAsset}`);
    }

    // Get user's wallet
    const walletType = market === 'futures' ? 'futures' : 'spot';
    const walletCurrency = side === 'buy' ? tradingPair.quoteAsset : tradingPair.baseAsset;

    const wallet = await Wallet.findOne({
      where: { userId, type: walletType, currency: walletCurrency },
    });

    if (!wallet) {
      throw new BadRequestError(`No ${walletCurrency} wallet found`);
    }

    // Calculate required balance
    const requiredBalance = side === 'buy'
      ? orderValue / leverage
      : quantity;

    // Check balance
    if (parseFloat(wallet.available) < requiredBalance) {
      throw new BadRequestError('Insufficient balance');
    }

    // Start transaction
    const t = await sequelize.transaction();

    try {
      // Lock balance
      await wallet.lockBalance(requiredBalance);

      // Calculate fee
      const feeRate = postOnly ? parseFloat(tradingPair.makerFee) : parseFloat(tradingPair.takerFee);
      const fee = orderValue * feeRate;

      // Create order
      const order = await Order.create({
        orderId: generateOrderId(market.toUpperCase().slice(0, 3)),
        userId,
        market,
        symbol,
        baseCurrency: tradingPair.baseAsset,
        quoteCurrency: tradingPair.quoteAsset,
        side,
        type,
        price: type === 'market' ? null : price,
        stopPrice,
        quantity,
        filledQuantity: 0,
        leverage,
        takeProfit,
        stopLoss,
        timeInForce,
        reduceOnly,
        postOnly,
        clientOrderId,
        feeRate,
        status: type === 'market' ? 'pending' : 'open',
        openedAt: new Date(),
      }, { transaction: t });

      // For market orders, execute immediately (simplified)
      if (type === 'market') {
        await this.executeMarketOrder(order, tradingPair, wallet, t);
      }

      await t.commit();

      logger.info(`Order created: ${order.orderId} by user ${userId}`);

      return order;
    } catch (error) {
      await t.rollback();
      // Unlock balance on failure
      await wallet.unlockBalance(requiredBalance);
      throw error;
    }
  }

  /**
   * Execute market order (simplified simulation)
   */
  async executeMarketOrder(order, tradingPair, wallet, transaction) {
    const executionPrice = parseFloat(tradingPair.price);
    const quantity = parseFloat(order.quantity);
    const fee = quantity * executionPrice * parseFloat(order.feeRate);

    // Create trade record
    const trade = await Trade.create({
      tradeId: `T${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      orderId: order.id,
      userId: order.userId,
      market: order.market,
      symbol: order.symbol,
      side: order.side,
      price: executionPrice,
      quantity,
      fee,
      feeCurrency: order.quoteCurrency,
      feeRate: order.feeRate,
      isMaker: false,
      executedAt: new Date(),
    }, { transaction });

    // Update order
    await order.update({
      filledQuantity: quantity,
      avgPrice: executionPrice,
      totalValue: quantity * executionPrice,
      fee,
      feeCurrency: order.quoteCurrency,
      status: 'filled',
      filledAt: new Date(),
    }, { transaction });

    // Update wallet balances
    const walletType = order.market === 'futures' ? 'futures' : 'spot';

    if (order.side === 'buy') {
      // Deduct quote currency, add base currency
      const quoteWallet = await Wallet.findOne({
        where: { userId: order.userId, type: walletType, currency: order.quoteCurrency },
      });

      let baseWallet = await Wallet.findOne({
        where: { userId: order.userId, type: walletType, currency: order.baseCurrency },
      });

      if (!baseWallet) {
        baseWallet = await Wallet.create({
          userId: order.userId,
          type: walletType,
          currency: order.baseCurrency,
        }, { transaction });
      }

      const totalCost = (quantity * executionPrice) + fee;
      await quoteWallet.update({
        locked: parseFloat(quoteWallet.locked) - totalCost,
      }, { transaction });

      await baseWallet.update({
        available: parseFloat(baseWallet.available) + quantity,
      }, { transaction });

    } else {
      // Deduct base currency, add quote currency
      const baseWallet = await Wallet.findOne({
        where: { userId: order.userId, type: walletType, currency: order.baseCurrency },
      });

      let quoteWallet = await Wallet.findOne({
        where: { userId: order.userId, type: walletType, currency: order.quoteCurrency },
      });

      if (!quoteWallet) {
        quoteWallet = await Wallet.create({
          userId: order.userId,
          type: walletType,
          currency: order.quoteCurrency,
        }, { transaction });
      }

      await baseWallet.update({
        locked: parseFloat(baseWallet.locked) - quantity,
      }, { transaction });

      const proceeds = (quantity * executionPrice) - fee;
      await quoteWallet.update({
        available: parseFloat(quoteWallet.available) + proceeds,
      }, { transaction });
    }

    // Create transaction records
    await Transaction.create({
      transactionId: generateTransactionId('TRD'),
      userId: order.userId,
      walletId: wallet.id,
      type: order.side === 'buy' ? 'trade_buy' : 'trade_sell',
      currency: order.side === 'buy' ? order.baseCurrency : order.quoteCurrency,
      amount: order.side === 'buy' ? quantity : quantity * executionPrice,
      fee,
      feeCurrency: order.quoteCurrency,
      status: 'completed',
      orderId: order.id,
      tradePair: order.symbol,
      price: executionPrice,
      quantity,
      completedAt: new Date(),
    }, { transaction });

    return trade;
  }

  /**
   * Get orders for a user
   */
  async getOrders(userId, filters = {}) {
    const { market, symbol, side, status, startDate, endDate, page = 1, limit = 20 } = filters;

    const where = { userId };

    if (market) where.market = market;
    if (symbol) where.symbol = symbol;
    if (side) where.side = side;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      orders: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get open orders
   */
  async getOpenOrders(userId, market = null, symbol = null) {
    const where = {
      userId,
      status: { [Op.in]: ['open', 'partially_filled'] },
    };

    if (market) where.market = market;
    if (symbol) where.symbol = symbol;

    const orders = await Order.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    return orders;
  }

  /**
   * Get order by ID
   */
  async getOrderById(userId, orderId) {
    const order = await Order.findOne({
      where: { id: orderId, userId },
      include: [{ model: Trade, as: 'trades' }],
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  /**
   * Cancel order
   */
  async cancelOrder(userId, orderId) {
    const order = await Order.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (!['open', 'partially_filled', 'pending'].includes(order.status)) {
      throw new BadRequestError('Order cannot be cancelled');
    }

    const t = await sequelize.transaction();

    try {
      // Unlock remaining balance
      const walletType = order.market === 'futures' ? 'futures' : 'spot';
      const walletCurrency = order.side === 'buy' ? order.quoteCurrency : order.baseCurrency;

      const wallet = await Wallet.findOne({
        where: { userId, type: walletType, currency: walletCurrency },
      });

      if (wallet) {
        const remainingQuantity = parseFloat(order.quantity) - parseFloat(order.filledQuantity);
        const remainingValue = order.side === 'buy'
          ? remainingQuantity * parseFloat(order.price || 0)
          : remainingQuantity;

        await wallet.update({
          available: parseFloat(wallet.available) + remainingValue,
          locked: parseFloat(wallet.locked) - remainingValue,
        }, { transaction: t });
      }

      // Update order status
      await order.update({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'User requested cancellation',
      }, { transaction: t });

      await t.commit();

      logger.info(`Order cancelled: ${order.orderId} by user ${userId}`);

      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Cancel all open orders
   */
  async cancelAllOrders(userId, market = null, symbol = null) {
    const where = {
      userId,
      status: { [Op.in]: ['open', 'partially_filled'] },
    };

    if (market) where.market = market;
    if (symbol) where.symbol = symbol;

    const orders = await Order.findAll({ where });

    const results = await Promise.allSettled(
      orders.map(order => this.cancelOrder(userId, order.id))
    );

    const cancelled = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { cancelled, failed, total: orders.length };
  }

  /**
   * Get trades for a user
   */
  async getTrades(userId, filters = {}) {
    const { market, symbol, side, startDate, endDate, page = 1, limit = 20 } = filters;

    const where = { userId };

    if (market) where.market = market;
    if (symbol) where.symbol = symbol;
    if (side) where.side = side;

    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) where.executedAt[Op.gte] = new Date(startDate);
      if (endDate) where.executedAt[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await Trade.findAndCountAll({
      where,
      order: [['executedAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      include: [{ model: Order, as: 'order', attributes: ['orderId', 'type', 'timeInForce'] }],
    });

    return {
      trades: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get trade by ID
   */
  async getTradeById(userId, tradeId) {
    const trade = await Trade.findOne({
      where: { id: tradeId, userId },
      include: [{ model: Order, as: 'order' }],
    });

    if (!trade) {
      throw new NotFoundError('Trade not found');
    }

    return trade;
  }

  /**
   * Get trading statistics
   */
  async getStatistics(userId, startDate = null, endDate = null) {
    const where = { userId };

    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) where.executedAt[Op.gte] = new Date(startDate);
      if (endDate) where.executedAt[Op.lte] = new Date(endDate);
    }

    const trades = await Trade.findAll({ where });

    const stats = {
      totalTrades: trades.length,
      buyTrades: trades.filter(t => t.side === 'buy').length,
      sellTrades: trades.filter(t => t.side === 'sell').length,
      totalVolume: trades.reduce((sum, t) => sum + parseFloat(t.quoteQuantity || 0), 0),
      totalFees: trades.reduce((sum, t) => sum + parseFloat(t.fee || 0), 0),
      byMarket: {},
      bySymbol: {},
    };

    // Group by market
    trades.forEach(trade => {
      if (!stats.byMarket[trade.market]) {
        stats.byMarket[trade.market] = { count: 0, volume: 0 };
      }
      stats.byMarket[trade.market].count++;
      stats.byMarket[trade.market].volume += parseFloat(trade.quoteQuantity || 0);

      if (!stats.bySymbol[trade.symbol]) {
        stats.bySymbol[trade.symbol] = { count: 0, volume: 0 };
      }
      stats.bySymbol[trade.symbol].count++;
      stats.bySymbol[trade.symbol].volume += parseFloat(trade.quoteQuantity || 0);
    });

    return stats;
  }

  /**
   * Get profit/loss data
   */
  async getProfitLoss(userId, period = '30d') {
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365,
    };

    const days = periodDays[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trades = await Trade.findAll({
      where: {
        userId,
        executedAt: { [Op.gte]: startDate },
      },
      order: [['executedAt', 'ASC']],
    });

    // Calculate daily P&L (simplified)
    const dailyPnL = {};
    trades.forEach(trade => {
      const date = trade.executedAt.toISOString().split('T')[0];
      if (!dailyPnL[date]) {
        dailyPnL[date] = { volume: 0, fees: 0, trades: 0 };
      }
      dailyPnL[date].volume += parseFloat(trade.quoteQuantity || 0);
      dailyPnL[date].fees += parseFloat(trade.fee || 0);
      dailyPnL[date].trades++;
    });

    return {
      period,
      startDate,
      endDate: new Date(),
      totalTrades: trades.length,
      totalVolume: trades.reduce((sum, t) => sum + parseFloat(t.quoteQuantity || 0), 0),
      totalFees: trades.reduce((sum, t) => sum + parseFloat(t.fee || 0), 0),
      dailyPnL: Object.entries(dailyPnL).map(([date, data]) => ({
        date,
        ...data,
      })),
    };
  }
}

module.exports = new TradeService();
