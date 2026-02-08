/**
 * Calculation Service
 * Handles financial calculations: fees, P&L, APY, conversions, and analytics
 */

const db = require('../config/database');
const logger = require('../config/logger');

class CalculationService {
  constructor() {
    // Fee structure by tier
    this.feeStructure = {
      maker: {
        standard: 0.001,      // 0.1%
        vip1: 0.0008,         // 0.08%
        vip2: 0.0006,         // 0.06%
        vip3: 0.0004,         // 0.04%
        vip4: 0.0002,         // 0.02%
        market_maker: 0       // 0%
      },
      taker: {
        standard: 0.002,      // 0.2%
        vip1: 0.0016,         // 0.16%
        vip2: 0.0012,         // 0.12%
        vip3: 0.0008,         // 0.08%
        vip4: 0.0004,         // 0.04%
        market_maker: 0.0001  // 0.01%
      },
      withdrawal: {
        BTC: 0.0005,
        ETH: 0.005,
        USDT: 1,
        USDC: 1,
        BNB: 0.001,
        XRP: 0.25,
        SOL: 0.01,
        ADA: 1,
        DOT: 0.1,
        MATIC: 1,
        default: 0.001
      }
    };

    // Volume tiers for fee discounts (30-day volume in USD)
    this.volumeTiers = {
      standard: 0,
      vip1: 50000,
      vip2: 100000,
      vip3: 500000,
      vip4: 1000000,
      market_maker: 5000000
    };
  }

  /**
   * Get user's fee tier based on 30-day trading volume
   */
  async getUserFeeTier(userId) {
    try {
      const { rows: [result] } = await db.query(`
        SELECT COALESCE(SUM(
          CASE 
            WHEN t.buyer_id = $1 THEN t.quote_amount
            WHEN t.seller_id = $1 THEN t.quote_amount
            ELSE 0
          END
        ), 0) as volume_30d
        FROM trades t
        WHERE (t.buyer_id = $1 OR t.seller_id = $1)
          AND t.created_at >= NOW() - INTERVAL '30 days'
      `, [userId]);

      const volume = parseFloat(result.volume_30d);

      if (volume >= this.volumeTiers.market_maker) return 'market_maker';
      if (volume >= this.volumeTiers.vip4) return 'vip4';
      if (volume >= this.volumeTiers.vip3) return 'vip3';
      if (volume >= this.volumeTiers.vip2) return 'vip2';
      if (volume >= this.volumeTiers.vip1) return 'vip1';
      return 'standard';
    } catch (error) {
      logger.error('Failed to get user fee tier:', error);
      return 'standard';
    }
  }

  /**
   * Calculate trading fees
   */
  async calculateTradingFee(userId, amount, isMaker = false) {
    const tier = await this.getUserFeeTier(userId);
    const feeRate = isMaker ? this.feeStructure.maker[tier] : this.feeStructure.taker[tier];
    const fee = amount * feeRate;

    return {
      amount,
      feeRate,
      fee,
      tier,
      isMaker,
      netAmount: isMaker ? amount - fee : amount + fee
    };
  }

  /**
   * Calculate withdrawal fee
   */
  calculateWithdrawalFee(symbol, amount) {
    const fee = this.feeStructure.withdrawal[symbol] || this.feeStructure.withdrawal.default;
    
    // Some networks have percentage-based fees for large amounts
    const percentageFee = amount * 0.0001; // 0.01% for large withdrawals
    const actualFee = Math.max(fee, percentageFee);

    return {
      symbol,
      amount,
      fee: actualFee,
      netAmount: amount - actualFee,
      feeType: actualFee === fee ? 'flat' : 'percentage'
    };
  }

  /**
   * Calculate profit/loss for a position
   */
  calculatePnL(entryPrice, currentPrice, quantity, side = 'long') {
    const entryValue = entryPrice * quantity;
    const currentValue = currentPrice * quantity;
    
    let pnl, pnlPercent;
    
    if (side === 'long') {
      pnl = currentValue - entryValue;
      pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    } else {
      pnl = entryValue - currentValue;
      pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
    }

    return {
      entryPrice,
      currentPrice,
      quantity,
      side,
      entryValue,
      currentValue,
      pnl,
      pnlPercent,
      isProfit: pnl > 0
    };
  }

  /**
   * Calculate portfolio P&L
   */
  async calculatePortfolioPnL(userId, prices = {}) {
    try {
      // Get user's holdings and cost basis
      const { rows: holdings } = await db.query(`
        SELECT 
          w.cryptocurrency_id,
          c.symbol,
          w.balance,
          COALESCE(cb.avg_cost, 0) as avg_cost,
          COALESCE(cb.total_invested, 0) as total_invested
        FROM wallets w
        JOIN cryptocurrencies c ON w.cryptocurrency_id = c.id
        LEFT JOIN (
          SELECT 
            cryptocurrency_id,
            SUM(amount * price) / NULLIF(SUM(amount), 0) as avg_cost,
            SUM(CASE WHEN type = 'buy' THEN amount * price ELSE 0 END) as total_invested
          FROM (
            SELECT 
              CASE 
                WHEN t.buyer_id = $1 THEN tp.base_currency_id
                ELSE NULL
              END as cryptocurrency_id,
              t.quantity as amount,
              t.price,
              'buy' as type
            FROM trades t
            JOIN trading_pairs tp ON t.trading_pair_id = tp.id
            WHERE t.buyer_id = $1

            UNION ALL

            SELECT 
              CASE 
                WHEN t.seller_id = $1 THEN tp.base_currency_id
                ELSE NULL
              END as cryptocurrency_id,
              t.quantity as amount,
              t.price,
              'sell' as type
            FROM trades t
            JOIN trading_pairs tp ON t.trading_pair_id = tp.id
            WHERE t.seller_id = $1
          ) trades
          WHERE cryptocurrency_id IS NOT NULL
          GROUP BY cryptocurrency_id
        ) cb ON w.cryptocurrency_id = cb.cryptocurrency_id
        WHERE w.user_id = $1 AND w.balance > 0
      `, [userId]);

      let totalCurrentValue = 0;
      let totalCostBasis = 0;
      const positions = [];

      for (const holding of holdings) {
        const currentPrice = prices[holding.symbol] || 0;
        const currentValue = parseFloat(holding.balance) * currentPrice;
        const costBasis = parseFloat(holding.balance) * parseFloat(holding.avg_cost);

        totalCurrentValue += currentValue;
        totalCostBasis += costBasis;

        const pnl = currentValue - costBasis;
        const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        positions.push({
          symbol: holding.symbol,
          balance: parseFloat(holding.balance),
          avgCost: parseFloat(holding.avg_cost),
          currentPrice,
          currentValue,
          costBasis,
          pnl,
          pnlPercent,
          isProfit: pnl > 0
        });
      }

      const totalPnL = totalCurrentValue - totalCostBasis;
      const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

      return {
        positions,
        summary: {
          totalCurrentValue,
          totalCostBasis,
          totalPnL,
          totalPnLPercent,
          isProfit: totalPnL > 0
        }
      };
    } catch (error) {
      logger.error('Failed to calculate portfolio P&L:', error);
      throw error;
    }
  }

  /**
   * Calculate realized P&L from trades
   */
  async calculateRealizedPnL(userId, startDate = null, endDate = null) {
    try {
      let dateFilter = '';
      const params = [userId];

      if (startDate) {
        params.push(startDate);
        dateFilter += ` AND t.created_at >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        dateFilter += ` AND t.created_at <= $${params.length}`;
      }

      const { rows: trades } = await db.query(`
        SELECT 
          t.*,
          tp.symbol as pair,
          c.symbol as base_symbol,
          CASE 
            WHEN t.buyer_id = $1 THEN 'buy'
            ELSE 'sell'
          END as side
        FROM trades t
        JOIN trading_pairs tp ON t.trading_pair_id = tp.id
        JOIN cryptocurrencies c ON tp.base_currency_id = c.id
        WHERE (t.buyer_id = $1 OR t.seller_id = $1)
        ${dateFilter}
        ORDER BY t.created_at ASC
      `, params);

      // Track cost basis using FIFO method
      const holdings = new Map();
      let realizedPnL = 0;
      let totalFees = 0;

      for (const trade of trades) {
        const symbol = trade.base_symbol;
        const quantity = parseFloat(trade.quantity);
        const price = parseFloat(trade.price);
        const fee = trade.side === 'buy' 
          ? parseFloat(trade.buyer_fee) 
          : parseFloat(trade.seller_fee);

        totalFees += fee;

        if (!holdings.has(symbol)) {
          holdings.set(symbol, []);
        }

        const lots = holdings.get(symbol);

        if (trade.side === 'buy') {
          // Add to holdings
          lots.push({ quantity, price, date: trade.created_at });
        } else {
          // Sell - calculate realized P&L using FIFO
          let remainingToSell = quantity;
          
          while (remainingToSell > 0 && lots.length > 0) {
            const lot = lots[0];
            const sellQuantity = Math.min(remainingToSell, lot.quantity);
            
            const costBasis = sellQuantity * lot.price;
            const proceeds = sellQuantity * price;
            realizedPnL += proceeds - costBasis;

            lot.quantity -= sellQuantity;
            remainingToSell -= sellQuantity;

            if (lot.quantity <= 0) {
              lots.shift();
            }
          }
        }
      }

      return {
        realizedPnL,
        totalFees,
        netRealizedPnL: realizedPnL - totalFees,
        tradeCount: trades.length,
        period: {
          start: startDate,
          end: endDate
        }
      };
    } catch (error) {
      logger.error('Failed to calculate realized P&L:', error);
      throw error;
    }
  }

  /**
   * Calculate APY for staking
   */
  calculateAPY(dailyRate, compoundingFrequency = 'daily') {
    const periodsPerYear = {
      continuous: Infinity,
      daily: 365,
      weekly: 52,
      monthly: 12,
      quarterly: 4,
      annually: 1
    };

    const n = periodsPerYear[compoundingFrequency] || 365;
    const ratePerPeriod = dailyRate * (365 / n);

    if (n === Infinity) {
      // Continuous compounding
      return (Math.exp(dailyRate * 365) - 1) * 100;
    }

    // Compound interest formula
    const apy = (Math.pow(1 + ratePerPeriod, n) - 1) * 100;
    return apy;
  }

  /**
   * Calculate staking rewards
   */
  calculateStakingRewards(principal, apy, daysStaked, compounded = false) {
    const dailyRate = apy / 100 / 365;
    
    let rewards;
    if (compounded) {
      // Compound interest
      rewards = principal * (Math.pow(1 + dailyRate, daysStaked) - 1);
    } else {
      // Simple interest
      rewards = principal * dailyRate * daysStaked;
    }

    return {
      principal,
      apy,
      daysStaked,
      compounded,
      rewards,
      totalValue: principal + rewards,
      effectiveRate: (rewards / principal) * 100
    };
  }

  /**
   * Calculate early unstaking penalty
   */
  calculateUnstakingPenalty(stakedAmount, rewards, daysRemaining, lockPeriodDays) {
    // Penalty based on how early you unstake
    // Full penalty if less than 25% of lock period complete
    // Reduced penalty thereafter
    
    const completionPercent = 1 - (daysRemaining / lockPeriodDays);
    
    let penaltyRate;
    if (completionPercent < 0.25) {
      penaltyRate = 0.25; // 25% of rewards
    } else if (completionPercent < 0.50) {
      penaltyRate = 0.15; // 15% of rewards
    } else if (completionPercent < 0.75) {
      penaltyRate = 0.10; // 10% of rewards
    } else {
      penaltyRate = 0.05; // 5% of rewards
    }

    const penalty = rewards * penaltyRate;
    
    return {
      stakedAmount,
      accruedRewards: rewards,
      penaltyRate,
      penalty,
      netRewards: rewards - penalty,
      totalReceived: stakedAmount + rewards - penalty,
      completionPercent: completionPercent * 100
    };
  }

  /**
   * Calculate conversion rate with spread
   */
  calculateConversion(fromAmount, fromPrice, toPrice, spreadPercent = 0.1) {
    // Apply spread (half on each side)
    const halfSpread = spreadPercent / 200;
    const effectiveFromPrice = fromPrice * (1 - halfSpread);
    const effectiveToPrice = toPrice * (1 + halfSpread);

    const fromValueUsd = fromAmount * effectiveFromPrice;
    const toAmount = fromValueUsd / effectiveToPrice;
    const fee = fromAmount * (spreadPercent / 100);

    return {
      fromAmount,
      toAmount,
      rate: effectiveFromPrice / effectiveToPrice,
      marketRate: fromPrice / toPrice,
      spread: spreadPercent,
      fee,
      fromValueUsd
    };
  }

  /**
   * Calculate portfolio allocation
   */
  async calculateAllocation(userId, prices = {}) {
    try {
      const { rows: holdings } = await db.query(`
        SELECT 
          w.balance,
          c.symbol,
          c.name,
          c.category
        FROM wallets w
        JOIN cryptocurrencies c ON w.cryptocurrency_id = c.id
        WHERE w.user_id = $1 AND w.balance > 0
        ORDER BY w.balance DESC
      `, [userId]);

      let totalValue = 0;
      const allocations = holdings.map(h => {
        const value = parseFloat(h.balance) * (prices[h.symbol] || 0);
        totalValue += value;
        return {
          symbol: h.symbol,
          name: h.name,
          category: h.category,
          balance: parseFloat(h.balance),
          value
        };
      });

      // Calculate percentages
      allocations.forEach(a => {
        a.percentage = totalValue > 0 ? (a.value / totalValue) * 100 : 0;
      });

      // Group by category
      const byCategory = {};
      for (const a of allocations) {
        const cat = a.category || 'Other';
        if (!byCategory[cat]) {
          byCategory[cat] = { value: 0, percentage: 0, assets: [] };
        }
        byCategory[cat].value += a.value;
        byCategory[cat].assets.push(a);
      }

      Object.keys(byCategory).forEach(cat => {
        byCategory[cat].percentage = totalValue > 0 
          ? (byCategory[cat].value / totalValue) * 100 
          : 0;
      });

      return {
        totalValue,
        allocations,
        byCategory,
        diversificationScore: this.calculateDiversificationScore(allocations)
      };
    } catch (error) {
      logger.error('Failed to calculate allocation:', error);
      throw error;
    }
  }

  /**
   * Calculate diversification score (0-100)
   */
  calculateDiversificationScore(allocations) {
    if (allocations.length === 0) return 0;
    if (allocations.length === 1) return 10;

    // Use Herfindahl-Hirschman Index (HHI) for concentration
    const hhi = allocations.reduce((sum, a) => sum + Math.pow(a.percentage / 100, 2), 0);
    
    // Convert HHI to score (lower HHI = more diversified = higher score)
    // HHI ranges from 1/n to 1 (0 to 10000 in traditional scale)
    const minHHI = 1 / allocations.length;
    const normalizedHHI = (hhi - minHHI) / (1 - minHHI);
    
    // Score: 100 = perfectly diversified, 0 = all in one asset
    const score = Math.round((1 - normalizedHHI) * 100);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate risk metrics
   */
  calculateRiskMetrics(returns) {
    if (!returns || returns.length < 2) {
      return null;
    }

    // Calculate mean return
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;

    // Calculate standard deviation (volatility)
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Calculate Sharpe Ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02 / 365; // Daily
    const sharpeRatio = stdDev > 0 ? (mean - riskFreeRate) / stdDev : 0;

    // Calculate max drawdown
    let peak = -Infinity;
    let maxDrawdown = 0;
    let cumReturn = 1;
    
    for (const ret of returns) {
      cumReturn *= (1 + ret);
      peak = Math.max(peak, cumReturn);
      const drawdown = (peak - cumReturn) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Calculate Sortino Ratio (downside deviation)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideVariance = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
      : 0;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0 ? (mean - riskFreeRate) / downsideDeviation : 0;

    return {
      meanReturn: mean * 100,
      volatility: stdDev * 100,
      sharpeRatio: sharpeRatio * Math.sqrt(365), // Annualized
      sortinoRatio: sortinoRatio * Math.sqrt(365), // Annualized
      maxDrawdown: maxDrawdown * 100,
      winRate: (returns.filter(r => r > 0).length / returns.length) * 100
    };
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  calculateVaR(portfolioValue, returns, confidenceLevel = 0.95) {
    if (!returns || returns.length < 30) {
      return null;
    }

    // Sort returns ascending
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // Find the percentile index
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const varReturn = sortedReturns[index];

    return {
      confidenceLevel: confidenceLevel * 100,
      dailyVaR: portfolioValue * Math.abs(varReturn),
      dailyVaRPercent: Math.abs(varReturn) * 100,
      // Scale to different periods
      weeklyVaR: portfolioValue * Math.abs(varReturn) * Math.sqrt(7),
      monthlyVaR: portfolioValue * Math.abs(varReturn) * Math.sqrt(30)
    };
  }
}

// Export singleton instance
module.exports = new CalculationService();
