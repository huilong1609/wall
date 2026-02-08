/**
 * Cron Jobs Service
 * Handles all scheduled tasks for the platform
 */

const cron = require('node-cron');
const pool = require('../config/database');
const logger = require('../config/logger');
const priceService = require('./price.service');
const emailService = require('./email.service');
const calculationService = require('./calculation.service');
const websocketService = require('./websocket.service');

class CronService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize all cron jobs
   */
  initialize() {
    if (this.isRunning) {
      logger.warn('Cron service already running');
      return;
    }

    // Price updates - every 30 seconds
    this.scheduleJob('priceUpdates', '*/30 * * * * *', this.updatePrices.bind(this));

    // Conditional orders check - every 10 seconds
    this.scheduleJob('conditionalOrders', '*/10 * * * * *', this.checkConditionalOrders.bind(this));

    // Staking rewards distribution - daily at midnight UTC
    this.scheduleJob('stakingRewards', '0 0 * * *', this.distributeStakingRewards.bind(this));

    // Interest calculation - daily at 1 AM UTC
    this.scheduleJob('interestCalculation', '0 1 * * *', this.calculateInterest.bind(this));

    // Market data aggregation - every hour
    this.scheduleJob('marketAggregation', '0 * * * *', this.aggregateMarketData.bind(this));

    // Cleanup expired sessions - every 6 hours
    this.scheduleJob('sessionCleanup', '0 */6 * * *', this.cleanupExpiredSessions.bind(this));

    // Send weekly reports - Sunday at 8 AM UTC
    this.scheduleJob('weeklyReports', '0 8 * * 0', this.sendWeeklyReports.bind(this));

    // Check price alerts - every minute
    this.scheduleJob('priceAlerts', '* * * * *', this.checkPriceAlerts.bind(this));

    // Auto-cancel expired orders - every 5 minutes
    this.scheduleJob('expiredOrders', '*/5 * * * *', this.cancelExpiredOrders.bind(this));

    // Update user statistics - every hour
    this.scheduleJob('userStats', '30 * * * *', this.updateUserStatistics.bind(this));

    // Referral rewards processing - every hour
    this.scheduleJob('referralRewards', '15 * * * *', this.processReferralRewards.bind(this));

    // KYC reminder emails - daily at 10 AM UTC
    this.scheduleJob('kycReminders', '0 10 * * *', this.sendKycReminders.bind(this));

    this.isRunning = true;
    logger.info('Cron service initialized with ' + this.jobs.size + ' jobs');
  }

  /**
   * Schedule a cron job
   */
  scheduleJob(name, schedule, task) {
    try {
      const job = cron.schedule(schedule, async () => {
        const startTime = Date.now();
        try {
          await task();
          logger.debug(`Cron job ${name} completed in ${Date.now() - startTime}ms`);
        } catch (error) {
          logger.error(`Cron job ${name} failed:`, error);
        }
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.jobs.set(name, { job, schedule, lastRun: null, status: 'active' });
      logger.info(`Scheduled cron job: ${name} (${schedule})`);
    } catch (error) {
      logger.error(`Failed to schedule cron job ${name}:`, error);
    }
  }

  /**
   * Update cryptocurrency prices
   */
  async updatePrices() {
    try {
      const result = await pool.query(
        'SELECT symbol FROM cryptocurrencies WHERE is_active = true'
      );

      if (result.rows.length === 0) return;

      const symbols = result.rows.map(r => r.symbol);
      const prices = await priceService.getPrices(symbols);

      for (const [symbol, data] of Object.entries(prices)) {
        // Update price in database
        await pool.query(`
          UPDATE cryptocurrencies 
          SET current_price = $1, 
              price_change_24h = $2,
              price_change_percentage_24h = $3,
              volume_24h = $4,
              market_cap = $5,
              updated_at = NOW()
          WHERE symbol = $6
        `, [
          data.price,
          data.change24h || 0,
          data.changePercent24h || 0,
          data.volume24h || 0,
          data.marketCap || 0,
          symbol
        ]);

        // Broadcast price update via WebSocket
        websocketService.broadcastTicker(symbol, {
          symbol,
          price: data.price,
          change24h: data.change24h,
          changePercent24h: data.changePercent24h,
          volume24h: data.volume24h,
          high24h: data.high24h,
          low24h: data.low24h,
          timestamp: Date.now()
        });
      }

      this.jobs.get('priceUpdates').lastRun = new Date();
    } catch (error) {
      logger.error('Price update job failed:', error);
      throw error;
    }
  }

  /**
   * Check and execute conditional orders (stop-loss, take-profit)
   */
  async checkConditionalOrders() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get all pending conditional orders
      const result = await client.query(`
        SELECT o.*, tp.symbol as pair_symbol
        FROM orders o
        JOIN trading_pairs tp ON o.trading_pair_id = tp.id
        WHERE o.status = 'pending'
        AND o.order_type IN ('stop_loss', 'take_profit', 'stop_limit')
        ORDER BY o.created_at ASC
      `);

      for (const order of result.rows) {
        const baseSymbol = order.pair_symbol.split('/')[0];
        const priceData = await priceService.getPrice(baseSymbol);
        
        if (!priceData) continue;

        const currentPrice = parseFloat(priceData.price);
        const triggerPrice = parseFloat(order.trigger_price);
        let shouldTrigger = false;

        if (order.order_type === 'stop_loss') {
          // Stop loss triggers when price falls below trigger
          shouldTrigger = order.side === 'sell' 
            ? currentPrice <= triggerPrice 
            : currentPrice >= triggerPrice;
        } else if (order.order_type === 'take_profit') {
          // Take profit triggers when price reaches target
          shouldTrigger = order.side === 'sell'
            ? currentPrice >= triggerPrice
            : currentPrice <= triggerPrice;
        } else if (order.order_type === 'stop_limit') {
          // Stop limit triggers and places limit order
          shouldTrigger = order.side === 'sell'
            ? currentPrice <= triggerPrice
            : currentPrice >= triggerPrice;
        }

        if (shouldTrigger) {
          // Convert to market or limit order
          const newType = order.order_type === 'stop_limit' ? 'limit' : 'market';
          
          await client.query(`
            UPDATE orders 
            SET order_type = $1, 
                status = 'open',
                triggered_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
          `, [newType, order.id]);

          logger.info(`Conditional order ${order.id} triggered at price ${currentPrice}`);

          // Notify user
          websocketService.sendOrderUpdate(order.user_id, {
            type: 'order_triggered',
            orderId: order.id,
            orderType: order.order_type,
            triggerPrice,
            currentPrice,
            newOrderType: newType
          });
        }
      }

      await client.query('COMMIT');
      this.jobs.get('conditionalOrders').lastRun = new Date();
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Conditional orders check failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Distribute daily staking rewards
   */
  async distributeStakingRewards() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get all active stakes
      const stakes = await client.query(`
        SELECT s.*, sp.apy, sp.reward_frequency, sp.compound_frequency,
               c.symbol, c.decimals
        FROM stakes s
        JOIN staking_pools sp ON s.staking_pool_id = sp.id
        JOIN cryptocurrencies c ON sp.cryptocurrency_id = c.id
        WHERE s.status = 'active'
        AND s.end_date > NOW()
      `);

      let totalRewardsDistributed = 0;

      for (const stake of stakes.rows) {
        // Calculate daily reward
        const amount = parseFloat(stake.amount);
        const apy = parseFloat(stake.apy);
        const dailyRate = apy / 365 / 100;
        const reward = amount * dailyRate;

        if (reward <= 0) continue;

        // Add reward to pending rewards
        await client.query(`
          UPDATE stakes 
          SET pending_rewards = pending_rewards + $1,
              total_rewards = total_rewards + $1,
              last_reward_at = NOW(),
              updated_at = NOW()
          WHERE id = $2
        `, [reward, stake.id]);

        // Record reward transaction
        await client.query(`
          INSERT INTO staking_rewards (
            stake_id, user_id, amount, reward_type, status, created_at
          ) VALUES ($1, $2, $3, 'daily', 'distributed', NOW())
        `, [stake.id, stake.user_id, reward]);

        // Check if auto-compound is enabled
        if (stake.auto_compound) {
          await client.query(`
            UPDATE stakes 
            SET amount = amount + pending_rewards,
                pending_rewards = 0,
                updated_at = NOW()
            WHERE id = $1
          `, [stake.id]);
        }

        totalRewardsDistributed++;

        // Notify user of reward
        websocketService.sendNotification(stake.user_id, {
          type: 'staking_reward',
          stakeId: stake.id,
          symbol: stake.symbol,
          reward: reward.toFixed(stake.decimals),
          totalRewards: (parseFloat(stake.total_rewards) + reward).toFixed(stake.decimals)
        });
      }

      await client.query('COMMIT');
      logger.info(`Distributed staking rewards for ${totalRewardsDistributed} stakes`);
      this.jobs.get('stakingRewards').lastRun = new Date();
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Staking rewards distribution failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate daily interest for savings accounts
   */
  async calculateInterest() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get all savings accounts with positive balance
      const accounts = await client.query(`
        SELECT sa.*, c.symbol, c.decimals
        FROM savings_accounts sa
        JOIN cryptocurrencies c ON sa.cryptocurrency_id = c.id
        WHERE sa.balance > 0
        AND sa.is_active = true
      `);

      for (const account of accounts.rows) {
        const balance = parseFloat(account.balance);
        const apy = parseFloat(account.apy || 0.05); // Default 5% APY
        const dailyRate = apy / 365;
        const interest = balance * dailyRate;

        if (interest <= 0) continue;

        // Add interest to balance
        await client.query(`
          UPDATE savings_accounts 
          SET balance = balance + $1,
              total_interest_earned = total_interest_earned + $1,
              last_interest_at = NOW(),
              updated_at = NOW()
          WHERE id = $2
        `, [interest, account.id]);

        // Record interest transaction
        await client.query(`
          INSERT INTO interest_transactions (
            savings_account_id, user_id, amount, balance_snapshot, 
            apy_snapshot, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [account.id, account.user_id, interest, balance, apy]);
      }

      await client.query('COMMIT');
      logger.info(`Calculated interest for ${accounts.rows.length} savings accounts`);
      this.jobs.get('interestCalculation').lastRun = new Date();
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Interest calculation failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Aggregate market data for analytics
   */
  async aggregateMarketData() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const now = new Date();
      const hourAgo = new Date(now - 60 * 60 * 1000);

      // Aggregate hourly trading volume
      const volumeResult = await client.query(`
        SELECT 
          tp.id as trading_pair_id,
          tp.symbol,
          COUNT(*) as trade_count,
          SUM(t.quantity) as volume,
          SUM(t.quantity * t.price) as volume_quote,
          AVG(t.price) as avg_price,
          MAX(t.price) as high_price,
          MIN(t.price) as low_price,
          (SELECT price FROM trades WHERE trading_pair_id = tp.id ORDER BY created_at ASC LIMIT 1) as open_price,
          (SELECT price FROM trades WHERE trading_pair_id = tp.id ORDER BY created_at DESC LIMIT 1) as close_price
        FROM trades t
        JOIN trading_pairs tp ON t.trading_pair_id = tp.id
        WHERE t.created_at >= $1 AND t.created_at < $2
        GROUP BY tp.id, tp.symbol
      `, [hourAgo, now]);

      // Insert aggregated data
      for (const row of volumeResult.rows) {
        await client.query(`
          INSERT INTO market_aggregates (
            trading_pair_id, timeframe, open_price, high_price, 
            low_price, close_price, volume, volume_quote, 
            trade_count, timestamp
          ) VALUES ($1, '1h', $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (trading_pair_id, timeframe, timestamp) 
          DO UPDATE SET
            high_price = GREATEST(market_aggregates.high_price, EXCLUDED.high_price),
            low_price = LEAST(market_aggregates.low_price, EXCLUDED.low_price),
            close_price = EXCLUDED.close_price,
            volume = market_aggregates.volume + EXCLUDED.volume,
            trade_count = market_aggregates.trade_count + EXCLUDED.trade_count
        `, [
          row.trading_pair_id,
          row.open_price || 0,
          row.high_price || 0,
          row.low_price || 0,
          row.close_price || 0,
          row.volume || 0,
          row.volume_quote || 0,
          row.trade_count || 0,
          hourAgo
        ]);
      }

      // Update 24h statistics for trading pairs
      await client.query(`
        UPDATE trading_pairs tp SET
          volume_24h = COALESCE((
            SELECT SUM(volume) FROM market_aggregates 
            WHERE trading_pair_id = tp.id 
            AND timestamp > NOW() - INTERVAL '24 hours'
          ), 0),
          high_24h = COALESCE((
            SELECT MAX(high_price) FROM market_aggregates 
            WHERE trading_pair_id = tp.id 
            AND timestamp > NOW() - INTERVAL '24 hours'
          ), tp.last_price),
          low_24h = COALESCE((
            SELECT MIN(low_price) FROM market_aggregates 
            WHERE trading_pair_id = tp.id 
            AND timestamp > NOW() - INTERVAL '24 hours'
          ), tp.last_price),
          updated_at = NOW()
      `);

      await client.query('COMMIT');
      logger.info('Market data aggregation completed');
      this.jobs.get('marketAggregation').lastRun = new Date();
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Market data aggregation failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup expired sessions and tokens
   */
  async cleanupExpiredSessions() {
    try {
      // Delete expired refresh tokens
      const tokensResult = await pool.query(`
        DELETE FROM refresh_tokens WHERE expires_at < NOW()
      `);

      // Delete expired password reset tokens
      const resetResult = await pool.query(`
        DELETE FROM password_reset_tokens WHERE expires_at < NOW()
      `);

      // Delete expired verification codes
      const verifyResult = await pool.query(`
        DELETE FROM verification_codes WHERE expires_at < NOW()
      `);

      // Delete old notifications (older than 90 days)
      const notifResult = await pool.query(`
        DELETE FROM notifications 
        WHERE created_at < NOW() - INTERVAL '90 days'
        AND is_read = true
      `);

      logger.info(`Cleanup completed: ${tokensResult.rowCount} tokens, ${resetResult.rowCount} reset tokens, ${verifyResult.rowCount} verification codes, ${notifResult.rowCount} notifications`);
      this.jobs.get('sessionCleanup').lastRun = new Date();
    } catch (error) {
      logger.error('Session cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Send weekly portfolio reports
   */
  async sendWeeklyReports() {
    try {
      // Get users with weekly report preference
      const users = await pool.query(`
        SELECT u.id, u.email, u.first_name,
               up.weekly_report_enabled
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE u.email_verified = true
        AND (up.weekly_report_enabled = true OR up.weekly_report_enabled IS NULL)
      `);

      for (const user of users.rows) {
        try {
          // Get portfolio summary
          const portfolio = await pool.query(`
            SELECT 
              SUM(w.balance * c.current_price) as total_value,
              COUNT(DISTINCT w.cryptocurrency_id) as asset_count
            FROM wallets w
            JOIN cryptocurrencies c ON w.cryptocurrency_id = c.id
            WHERE w.user_id = $1 AND w.balance > 0
          `, [user.id]);

          // Get weekly P&L
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const trades = await pool.query(`
            SELECT 
              COUNT(*) as trade_count,
              SUM(CASE WHEN side = 'buy' THEN -total ELSE total END) as realized_pnl
            FROM trades
            WHERE user_id = $1 AND created_at >= $2
          `, [user.id, weekAgo]);

          // Get top performers
          const topPerformers = await pool.query(`
            SELECT c.symbol, c.price_change_percentage_24h as change
            FROM wallets w
            JOIN cryptocurrencies c ON w.cryptocurrency_id = c.id
            WHERE w.user_id = $1 AND w.balance > 0
            ORDER BY c.price_change_percentage_24h DESC
            LIMIT 3
          `, [user.id]);

          // Send weekly report email
          await emailService.sendEmail(user.email, 'weeklyReport', {
            name: user.first_name || 'Trader',
            totalValue: portfolio.rows[0]?.total_value || 0,
            assetCount: portfolio.rows[0]?.asset_count || 0,
            tradeCount: trades.rows[0]?.trade_count || 0,
            weeklyPnl: trades.rows[0]?.realized_pnl || 0,
            topPerformers: topPerformers.rows,
            period: {
              start: weekAgo.toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0]
            }
          });
        } catch (error) {
          logger.error(`Failed to send weekly report to user ${user.id}:`, error);
        }
      }

      logger.info(`Sent weekly reports to ${users.rows.length} users`);
      this.jobs.get('weeklyReports').lastRun = new Date();
    } catch (error) {
      logger.error('Weekly reports job failed:', error);
      throw error;
    }
  }

  /**
   * Check and trigger price alerts
   */
  async checkPriceAlerts() {
    try {
      // Get all active price alerts
      const alerts = await pool.query(`
        SELECT pa.*, c.symbol, c.current_price, u.email, u.first_name
        FROM price_alerts pa
        JOIN cryptocurrencies c ON pa.cryptocurrency_id = c.id
        JOIN users u ON pa.user_id = u.id
        WHERE pa.is_active = true
        AND pa.triggered_at IS NULL
      `);

      for (const alert of alerts.rows) {
        const currentPrice = parseFloat(alert.current_price);
        const targetPrice = parseFloat(alert.target_price);
        let triggered = false;

        if (alert.condition === 'above' && currentPrice >= targetPrice) {
          triggered = true;
        } else if (alert.condition === 'below' && currentPrice <= targetPrice) {
          triggered = true;
        }

        if (triggered) {
          // Mark alert as triggered
          await pool.query(`
            UPDATE price_alerts 
            SET triggered_at = NOW(), 
                is_active = CASE WHEN is_recurring THEN true ELSE false END,
                updated_at = NOW()
            WHERE id = $1
          `, [alert.id]);

          // Send notification
          websocketService.sendPriceAlertTriggered(alert.user_id, {
            alertId: alert.id,
            symbol: alert.symbol,
            condition: alert.condition,
            targetPrice,
            currentPrice,
            triggeredAt: new Date().toISOString()
          });

          // Send email notification
          if (alert.notify_email) {
            await emailService.sendEmail(alert.email, 'priceAlert', {
              name: alert.first_name || 'Trader',
              symbol: alert.symbol,
              condition: alert.condition,
              targetPrice,
              currentPrice
            });
          }

          logger.info(`Price alert ${alert.id} triggered for ${alert.symbol} at ${currentPrice}`);
        }
      }

      this.jobs.get('priceAlerts').lastRun = new Date();
    } catch (error) {
      logger.error('Price alerts check failed:', error);
      throw error;
    }
  }

  /**
   * Cancel expired orders
   */
  async cancelExpiredOrders() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get expired orders
      const expired = await client.query(`
        SELECT o.*, w.id as wallet_id
        FROM orders o
        JOIN wallets w ON o.user_id = w.user_id
        WHERE o.status = 'open'
        AND o.expires_at IS NOT NULL
        AND o.expires_at < NOW()
      `);

      for (const order of expired.rows) {
        // Unlock funds
        const unlockAmount = order.side === 'buy' 
          ? parseFloat(order.quantity) * parseFloat(order.price)
          : parseFloat(order.quantity);

        await client.query(`
          UPDATE wallets 
          SET locked_balance = locked_balance - $1,
              updated_at = NOW()
          WHERE id = $2
        `, [unlockAmount, order.wallet_id]);

        // Cancel order
        await client.query(`
          UPDATE orders 
          SET status = 'expired',
              updated_at = NOW()
          WHERE id = $1
        `, [order.id]);

        // Notify user
        websocketService.sendOrderUpdate(order.user_id, {
          type: 'order_expired',
          orderId: order.id,
          symbol: order.symbol
        });
      }

      await client.query('COMMIT');
      
      if (expired.rows.length > 0) {
        logger.info(`Cancelled ${expired.rows.length} expired orders`);
      }
      
      this.jobs.get('expiredOrders').lastRun = new Date();
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Expired orders cancellation failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user trading statistics
   */
  async updateUserStatistics() {
    try {
      // Update 24h and 30d trading volumes
      await pool.query(`
        UPDATE users u SET
          trading_volume_24h = COALESCE((
            SELECT SUM(t.quantity * t.price)
            FROM trades t
            WHERE t.user_id = u.id
            AND t.created_at > NOW() - INTERVAL '24 hours'
          ), 0),
          trading_volume_30d = COALESCE((
            SELECT SUM(t.quantity * t.price)
            FROM trades t
            WHERE t.user_id = u.id
            AND t.created_at > NOW() - INTERVAL '30 days'
          ), 0),
          updated_at = NOW()
      `);

      // Update user fee tiers based on volume
      await pool.query(`
        UPDATE users SET
          fee_tier = CASE
            WHEN trading_volume_30d >= 5000000 THEN 'market_maker'
            WHEN trading_volume_30d >= 1000000 THEN 'vip4'
            WHEN trading_volume_30d >= 500000 THEN 'vip3'
            WHEN trading_volume_30d >= 100000 THEN 'vip2'
            WHEN trading_volume_30d >= 50000 THEN 'vip1'
            ELSE 'standard'
          END,
          updated_at = NOW()
        WHERE fee_tier != CASE
          WHEN trading_volume_30d >= 5000000 THEN 'market_maker'
          WHEN trading_volume_30d >= 1000000 THEN 'vip4'
          WHEN trading_volume_30d >= 500000 THEN 'vip3'
          WHEN trading_volume_30d >= 100000 THEN 'vip2'
          WHEN trading_volume_30d >= 50000 THEN 'vip1'
          ELSE 'standard'
        END
      `);

      logger.info('User statistics updated');
      this.jobs.get('userStats').lastRun = new Date();
    } catch (error) {
      logger.error('User statistics update failed:', error);
      throw error;
    }
  }

  /**
   * Process pending referral rewards
   */
  async processReferralRewards() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get pending referral rewards
      const pending = await client.query(`
        SELECT rr.*, u.email, u.first_name, c.symbol
        FROM referral_rewards rr
        JOIN users u ON rr.referrer_id = u.id
        JOIN cryptocurrencies c ON rr.cryptocurrency_id = c.id
        WHERE rr.status = 'pending'
        AND rr.created_at < NOW() - INTERVAL '24 hours'
      `);

      for (const reward of pending.rows) {
        // Credit reward to referrer's wallet
        await client.query(`
          UPDATE wallets 
          SET balance = balance + $1,
              updated_at = NOW()
          WHERE user_id = $2 AND cryptocurrency_id = $3
        `, [reward.amount, reward.referrer_id, reward.cryptocurrency_id]);

        // Update reward status
        await client.query(`
          UPDATE referral_rewards 
          SET status = 'paid',
              paid_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `, [reward.id]);

        // Send notification
        websocketService.sendNotification(reward.referrer_id, {
          type: 'referral_reward',
          amount: reward.amount,
          symbol: reward.symbol
        });

        // Send email
        await emailService.sendEmail(reward.email, 'referralReward', {
          name: reward.first_name || 'Trader',
          amount: reward.amount,
          symbol: reward.symbol
        });
      }

      await client.query('COMMIT');
      
      if (pending.rows.length > 0) {
        logger.info(`Processed ${pending.rows.length} referral rewards`);
      }
      
      this.jobs.get('referralRewards').lastRun = new Date();
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Referral rewards processing failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send KYC reminder emails
   */
  async sendKycReminders() {
    try {
      // Get users who haven't completed KYC after 7 days
      const users = await pool.query(`
        SELECT u.id, u.email, u.first_name
        FROM users u
        WHERE u.kyc_status = 'pending'
        AND u.created_at < NOW() - INTERVAL '7 days'
        AND u.created_at > NOW() - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM kyc_reminders kr 
          WHERE kr.user_id = u.id 
          AND kr.sent_at > NOW() - INTERVAL '7 days'
        )
      `);

      for (const user of users.rows) {
        try {
          await emailService.sendEmail(user.email, 'kycReminder', {
            name: user.first_name || 'Trader'
          });

          // Record reminder sent
          await pool.query(`
            INSERT INTO kyc_reminders (user_id, sent_at)
            VALUES ($1, NOW())
          `, [user.id]);
        } catch (error) {
          logger.error(`Failed to send KYC reminder to user ${user.id}:`, error);
        }
      }

      logger.info(`Sent KYC reminders to ${users.rows.length} users`);
      this.jobs.get('kycReminders').lastRun = new Date();
    } catch (error) {
      logger.error('KYC reminders job failed:', error);
      throw error;
    }
  }

  /**
   * Get status of all cron jobs
   */
  getStatus() {
    const status = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        schedule: job.schedule,
        status: job.status,
        lastRun: job.lastRun
      };
    }
    return status;
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    for (const [name, { job }] of this.jobs) {
      job.stop();
      logger.info(`Stopped cron job: ${name}`);
    }
    this.isRunning = false;
    logger.info('Cron service stopped');
  }

  /**
   * Manually trigger a specific job
   */
  async triggerJob(name) {
    const jobConfig = this.jobs.get(name);
    if (!jobConfig) {
      throw new Error(`Job ${name} not found`);
    }

    logger.info(`Manually triggering job: ${name}`);
    // Get the bound method from the job initialization
    const methods = {
      priceUpdates: this.updatePrices.bind(this),
      conditionalOrders: this.checkConditionalOrders.bind(this),
      stakingRewards: this.distributeStakingRewards.bind(this),
      interestCalculation: this.calculateInterest.bind(this),
      marketAggregation: this.aggregateMarketData.bind(this),
      sessionCleanup: this.cleanupExpiredSessions.bind(this),
      weeklyReports: this.sendWeeklyReports.bind(this),
      priceAlerts: this.checkPriceAlerts.bind(this),
      expiredOrders: this.cancelExpiredOrders.bind(this),
      userStats: this.updateUserStatistics.bind(this),
      referralRewards: this.processReferralRewards.bind(this),
      kycReminders: this.sendKycReminders.bind(this)
    };

    await methods[name]();
    return { success: true, job: name, triggeredAt: new Date() };
  }
}

module.exports = new CronService();
