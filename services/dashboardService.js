const { Op } = require('sequelize');
const {
  AssetHolding, Coin, Asset, User, Wallet, Transaction, Order, Trade,
  Notification, StakingPosition, Referral, CopyRelation,
  UserBalance
} = require('../models');


class DashboardService {
  /**
   * Get dashboard overview for user
   */
  async getOverview(userId) {
    const safeNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const formatMoney = (n) =>
      `$${safeNumber(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

    const [
      wallets,
      assets,
      balance,
       transactions,
    /* totalDeposits, */
      notifications,
      unreadNotifications
    ] = await Promise.all([
      Wallet.findAll({
        where: {
          userId,
          status: true,
          balance: { [Op.gte]: 0, [Op.ne]: null }, // ✅ fixed
        },
        include: [{ model: Coin, as: 'coin' }], // ✅ so w.coin exists (adjust if your alias differs)
      }),

      AssetHolding.findAndCountAll({ // ✅ fixed
        where: { userId },
        include: [{ model: Asset, as: 'asset' }],
      }),

      UserBalance.findOne({ where: { userId } }),

       Transaction.findAll({ where: { userId }, limit: 5, order: [['createdAt', 'DESC']] }),

     /* Transaction.sum({ where: { userId, type: 'deposit' }, col: 'amount' }), */ 

      Notification.findAll({ where: { userId, read: false }, limit: 3, order: [['createdAt', 'DESC']] }),

      Notification.count({ where: { userId, read: false } }),
    ]);
    

    const twallet = wallets.map(w => ({
      id: w.id,
      symbol: w.coin?.symbol,
      name: w.coin?.name,
      price: safeNumber(w.rate?.price) || 1,
      amount: (safeNumber(w.rate?.price) || 1) * safeNumber(w.balance),
      change: w.rate?.change24h,
      volume: w.rate?.volume,
      marketCap: w.rate?.marketCap,
      holdings: safeNumber(w.balance),
      category: 'crypto',
      icon: w.coin?.logo ?? w.logo,
      source: 'crypto', // ✅ required for distribution buckets
    }));
     
    const tasset = (assets?.rows ?? []).map(a => ({
      id: a.id,
      symbol: a.coin?.symbol,
      name: a.coin?.name,
      price: safeNumber(a.rate?.price) || 1,
      amount: (safeNumber(a.rate?.price) || 1) * safeNumber(a.quantity),
      change: a.rate?.change24h,
      volume: a.rate?.volume,
      marketCap: a.rate?.marketCap,
      holdings: safeNumber(a.quantity),
      category: 'asset',
      icon: a.coin?.logo ?? a.logo,
      source: 'asset', // ✅ required for distribution buckets
    }));

    const both = [...twallet, ...tasset];

    const topAssets = [...both]
      .sort((a, b) => safeNumber(b.amount) - safeNumber(a.amount))
      .slice(0, 6);

    const totalPortfolio = both.reduce((sum, i) => sum + safeNumber(i.amount), 0);

    const stats = {
      totalBalance: safeNumber(balance?.balance) + totalPortfolio,
      totalPortfolio,
      totalDeposits: safeNumber(0),
      fundingBalance: safeNumber(balance?.balance),
      assetCount: safeNumber(0),
    };

    /* const distribution = (() => {
      const sorted = [...both].sort((a, b) => safeNumber(b.amount) - safeNumber(a.amount));
      const total = sorted.reduce((sum, x) => sum + safeNumber(x.amount), 0);

      if (total <= 0) return [];

      const top6 = sorted.slice(0, 6);
      const rest = sorted.slice(6);

      const otherCryptoAmount = rest
        .filter(x => x.source === 'crypto')
        .reduce((sum, x) => sum + safeNumber(x.amount), 0);

      const otherAssetsAmount = rest
        .filter(x => x.source === 'asset')
        .reduce((sum, x) => sum + safeNumber(x.amount), 0);

      const topRows = top6.map(x => ({
        name: x.name || x.symbol || 'Unknown',
        value: Number(((safeNumber(x.amount) / total) * 100).toFixed(2)),
        amount: formatMoney(x.amount),
        symbol: x.symbol,
        id: x.id,
      }));

      const buckets = [
        {
          name: 'Other Crypto',
          value: Number(((otherCryptoAmount / total) * 100).toFixed(2)),
          amount: formatMoney(otherCryptoAmount),
        },
        {
          name: 'Other Assets',
          value: Number(((otherAssetsAmount / total) * 100).toFixed(2)),
          amount: formatMoney(otherAssetsAmount),
        },
      ].filter(b => b.value > 0);

      return [...topRows, ...buckets];
    })(); */

    const distribution = [];

    const recentActivity = transactions.map(t => ({
      id: t.id,
      type: t.type,
      title: t.title,
      description: t.description,
      value: t.amount,
      symbol: t.symbol,
      time: t.time,
      status: t.status,
    }));

    return { stats, recentActivity, topAssets, distribution, notifications, unreadNotifications };

    // Calculate total balance
    let totalBalance = 0;
    let totalAvailable = 0;
    let totalLocked = 0;
    const balanceByType = {};

    wallets.forEach(wallet => {
      const available = parseFloat(wallet.available) || 0;
      const locked = parseFloat(wallet.locked) || 0;
      const staked = parseFloat(wallet.staked) || 0;
      const total = available + locked + staked;

      totalAvailable += available;
      totalLocked += locked;
      totalBalance += total;

      if (!balanceByType[wallet.type]) {
        balanceByType[wallet.type] = 0;
      }
      balanceByType[wallet.type] += total;
    });

    return {
      balance: {
        total: totalBalance,
        available: totalAvailable,
        locked: totalLocked,
        byType: balanceByType,
        portfolioAssets: 100
      },
      stats: {
        totalBalance: 1000,
        totalDeposits: 500,
        fundingBalance: 176,
        assetCount: 10,
      },
      portfolio: {
        value: 153100,
        change: 2.5,
      },
      distribution: [
        { name: 'Bitcoin', value: 45, color: '#f7931a', amount: '$56,631.57' },
        { name: 'Apple', value: 25, color: '#627eea', amount: '$31,461.98' },
        { name: 'Gold', value: 15, color: '#26a17b', amount: '$18,877.19' },
        { name: 'Ethereum', value: 8, color: '#6366f1', amount: '$12,584.79' },
        { name: 'Other Altcoins', value: 5, color: '#8b5cf6', amount: '$6,292.39' },
        { name: 'Other Assets', value: 2, color: '#8b5cf6', amount: '$6,292.39' }
      ],
      recentActivity: [
        { type: 'deposit', title: 'Deposit into funding balance', description: 'via Bitcoin', value: '$1,019.48', time: '2 min ago', status: 'completed' },
        { type: 'withdraw', title: 'Withdraw ETH to funding balance', description: 'from wallet', value: '$3,426.84', time: '15 min ago', status: 'completed' },
        { type: 'deposit', title: 'Deposit USDT', description: '5,000 USDT', value: '$5,000.00', time: '1 hr ago', status: 'completed' },
        { type: 'withdraw', title: 'Withdraw BTC (external)', description: '0.124 BTC', value: '$1,234.50', time: '3 hr ago', status: 'pending' },
        { type: 'buy', title: 'Bought AAPL Stock', description: '12,500 shares', value: '$1,234.50', time: '3 hr ago', status: 'completed' },
        { type: 'sell', title: 'Sold ARND Stock', description: '10 shares', value: '$1,234.50', time: '3 hr ago', status: 'completed' },
        { type: 'swap', title: 'Swapped BTC for ETH', description: '1.2 BTC', value: '$1,234.50', time: '3 hr ago', status: 'pending' },
        { type: 'withdraw', title: 'Withdraw to BTC wallet', description: '0.124 BTC', value: '$1,234.50', time: '3 hr ago', status: 'cancelled' },
        { type: 'withdraw', title: 'Withdraw from funding balance', description: 'via bank transfer', value: '$1,234.50', time: '3 hr ago', status: 'failed' },
        { type: 'roi', title: 'Returns of Investment', description: 'roi into trade plane', value: '$1,234.50', time: '3 hr ago', status: 'completed' },
        { type: 'trade', title: 'Traded BTC/USDT', description: 'bought 10 units', value: '$1,234.50', time: '3 hr ago', status: 'pending' },

      ],
      cryptos: [
        { id: 1, symbol: 'BTC', name: 'Bitcoin', price: 43567.82, change: 2.45, volume: 28.5, marketCap: 850.2, color: '#f7931a', holdings: 1.32, sparkline: [42, 42.5, 43, 42.8, 43.2, 43.5, 43.6], category: 'l1', icon: '₿' },
        { id: 2, symbol: 'ETH', name: 'Ethereum', price: 2284.56, change: 4.32, volume: 15.2, marketCap: 275.6, color: '#627eea', holdings: 8.5, sparkline: [2.2, 2.22, 2.25, 2.24, 2.27, 2.28, 2.28], category: 'l1', icon: 'Ξ' },
        { id: 3, symbol: 'BNB', name: 'BNB', price: 312.45, change: -1.23, volume: 1.8, marketCap: 48.1, color: '#f3ba2f', holdings: 24.7, sparkline: [320, 318, 315, 314, 313, 312, 312], category: 'l1', icon: '◆' },
        { id: 4, symbol: 'SOL', name: 'Solana', price: 98.76, change: 5.67, volume: 2.1, marketCap: 42.3, color: '#9945ff', holdings: 45.2, sparkline: [93, 94, 95, 96, 97, 98, 98.8], category: 'l1', icon: '◎' },
        { id: 5, symbol: 'ADA', name: 'Cardano', price: 0.4567, change: -2.11, volume: 0.845, marketCap: 16.2, color: '#0033ad', holdings: 5420, sparkline: [0.47, 0.46, 0.465, 0.46, 0.458, 0.457, 0.456], category: 'l1', icon: '₳' },
        { id: 6, symbol: 'MATIC', name: 'Polygon', price: 0.8234, change: 8.45, volume: 0.62, marketCap: 8.4, color: '#8247e5', holdings: 3200, sparkline: [0.75, 0.77, 0.79, 0.81, 0.80, 0.82, 0.82], category: 'l2', icon: '⬡' },
      ],
      alerts: [
        { icon: 'TrendingUp', title: 'BTC up 5%', desc: 'Bitcoin reached $43,500', type: 'success' },
        { icon: 'AlertCircle', title: 'Price Alert', desc: 'ETH crossed $2,300', type: 'warning' },
        { icon: 'Shield', title: 'Security', desc: 'New login from Chrome', type: 'info' },
      ],
      openOrders,
      unreadNotifications,
    };
  }

  /**
   * Get portfolio summary
   */
  async getPortfolio(userId) {
    const wallets = await Wallet.findAll({ where: { userId } });

    const portfolio = {
      spot: { total: 0, assets: [] },
      futures: { total: 0, assets: [] },
      margin: { total: 0, assets: [] },
      funding: { total: 0, assets: [] },
      earn: { total: 0, assets: [] },
    };

    wallets.forEach(wallet => {
      const total = parseFloat(wallet.available) + parseFloat(wallet.locked) + parseFloat(wallet.staked);
      if (total > 0) {
        portfolio[wallet.type].assets.push({
          currency: wallet.currency,
          available: parseFloat(wallet.available),
          locked: parseFloat(wallet.locked),
          staked: parseFloat(wallet.staked),
          total,
        });
        portfolio[wallet.type].total += total;
      }
    });

    return portfolio;
  }

  /**
   * Get trading statistics
   */
  async getTradingStats(userId, period = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [trades, orders] = await Promise.all([
      Trade.findAll({
        where: { userId, executedAt: { [Op.gte]: startDate } },
      }),
      Order.findAll({
        where: { userId, createdAt: { [Op.gte]: startDate } },
      }),
    ]);

    const stats = {
      period,
      totalTrades: trades.length,
      totalOrders: orders.length,
      filledOrders: orders.filter(o => o.status === 'filled').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      buyTrades: trades.filter(t => t.side === 'buy').length,
      sellTrades: trades.filter(t => t.side === 'sell').length,
      totalVolume: trades.reduce((sum, t) => sum + (parseFloat(t.quoteQuantity) || 0), 0),
      totalFees: trades.reduce((sum, t) => sum + (parseFloat(t.fee) || 0), 0),
      winRate: 0,
      profitLoss: 0,
    };

    // Calculate P&L (simplified)
    const realizedPnl = trades.reduce((sum, t) => sum + (parseFloat(t.realizedPnl) || 0), 0);
    stats.profitLoss = realizedPnl;

    // Calculate win rate
    const profitableTrades = trades.filter(t => (parseFloat(t.realizedPnl) || 0) > 0).length;
    stats.winRate = trades.length > 0 ? (profitableTrades / trades.length) * 100 : 0;

    return stats;
  }

  /**
   * Get account activity
   */
  async getActivity(userId, page = 1, limit = 20) {
    const activities = [];

    // Get recent transactions
    const transactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    transactions.forEach(t => {
      activities.push({
        id: t.id,
        type: 'transaction',
        action: t.type,
        title: `${t.type.replace('_', ' ')} ${t.amount} ${t.currency}`,
        status: t.status,
        timestamp: t.createdAt,
      });
    });

    // Get recent orders
    const orders = await Order.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    orders.forEach(o => {
      activities.push({
        id: o.id,
        type: 'order',
        action: `${o.side} ${o.type}`,
        title: `${o.side.toUpperCase()} ${o.quantity} ${o.symbol} @ ${o.price || 'market'}`,
        status: o.status,
        timestamp: o.createdAt,
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const start = (page - 1) * limit;
    const paginatedActivities = activities.slice(start, start + limit);

    return {
      activities: paginatedActivities,
      pagination: {
        total: activities.length,
        page,
        limit,
        totalPages: Math.ceil(activities.length / limit),
      },
    };
  }

  /**
   * Get profit/loss chart data
   */
  async getPnLChart(userId, period = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trades = await Trade.findAll({
      where: { userId, executedAt: { [Op.gte]: startDate } },
      order: [['executedAt', 'ASC']],
    });

    // Group by day
    const dailyData = {};
    let cumulativePnl = 0;

    trades.forEach(trade => {
      const date = trade.executedAt.toISOString().split('T')[0];
      const pnl = parseFloat(trade.realizedPnl) || 0;

      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          pnl: 0,
          volume: 0,
          trades: 0,
          cumulativePnl: 0,
        };
      }

      dailyData[date].pnl += pnl;
      dailyData[date].volume += parseFloat(trade.quoteQuantity) || 0;
      dailyData[date].trades++;
      cumulativePnl += pnl;
      dailyData[date].cumulativePnl = cumulativePnl;
    });

    return Object.values(dailyData);
  }

  /**
   * Get balance history chart data
   */
  async getBalanceChart(userId, period = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await Transaction.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate },
        status: 'completed',
      },
      order: [['createdAt', 'ASC']],
    });

    // Group by day
    const dailyData = {};

    transactions.forEach(tx => {
      const date = tx.createdAt.toISOString().split('T')[0];

      if (!dailyData[date]) {
        dailyData[date] = { date, deposits: 0, withdrawals: 0, netChange: 0 };
      }

      const amount = parseFloat(tx.amount) || 0;
      if (tx.type === 'deposit') {
        dailyData[date].deposits += amount;
        dailyData[date].netChange += amount;
      } else if (tx.type === 'withdrawal') {
        dailyData[date].withdrawals += amount;
        dailyData[date].netChange -= amount;
      }
    });

    return Object.values(dailyData);
  }

  /**
   * Get quick stats for dashboard widgets
   */
  async getQuickStats(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayTrades,
      todayVolume,
      totalDeposits,
      totalWithdrawals,
      stakingPositions,
      copyRelations,
      referralCount,
    ] = await Promise.all([
      Trade.count({ where: { userId, executedAt: { [Op.gte]: today } } }),
      Trade.sum('quoteQuantity', { where: { userId, executedAt: { [Op.gte]: today } } }),
      Transaction.sum('amount', { where: { userId, type: 'deposit', status: 'completed' } }),
      Transaction.sum('amount', { where: { userId, type: 'withdrawal', status: 'completed' } }),
      StakingPosition.count({ where: { userId, status: 'active' } }),
      CopyRelation.count({ where: { copierId: userId, status: 'active', type: 'copy' } }),
      Referral.count({ where: { referrerId: userId } }),
    ]);

    return {
      todayTrades: todayTrades || 0,
      todayVolume: todayVolume || 0,
      totalDeposits: totalDeposits || 0,
      totalWithdrawals: totalWithdrawals || 0,
      activeStaking: stakingPositions || 0,
      activeCopyTrading: copyRelations || 0,
      totalReferrals: referralCount || 0,
    };
  }

  /**
   * Get recent notifications for dashboard
   */
  async getRecentNotifications(userId, limit = 5) {
    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
    });

    return notifications;
  }

  /**
   * Get market overview for dashboard
   */
  async getMarketOverview() {
    // This would typically come from market service
    // Returning mock data for now
    return {
      btcPrice: 42500.00,
      btcChange24h: 2.5,
      ethPrice: 2250.00,
      ethChange24h: 3.2,
      totalMarketCap: '1.65T',
      totalVolume24h: '85B',
      btcDominance: 52.3,
      fearGreedIndex: 65,
    };
  }
}

module.exports = new DashboardService();
