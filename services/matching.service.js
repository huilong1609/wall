/**
 * Matching Engine Service
 * Handles order matching, execution, and order book management
 */

const db = require('../config/database');
const logger = require('../config/logger');
const { generateUUID } = require('../utils/helpers');
const EventEmitter = require('events');

class MatchingEngine extends EventEmitter {
  constructor() {
    super();
    this.orderBooks = new Map(); // pair -> { bids: [], asks: [] }
    this.initialized = false;
  }

  /**
   * Initialize matching engine with existing orders
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load all open orders from database
      const { rows: openOrders } = await db.query(`
        SELECT o.*, tp.symbol as pair_symbol
        FROM orders o
        JOIN trading_pairs tp ON o.trading_pair_id = tp.id
        WHERE o.status IN ('open', 'partially_filled')
        ORDER BY o.created_at ASC
      `);

      // Build order books
      for (const order of openOrders) {
        this.addToOrderBook(order);
      }

      this.initialized = true;
      logger.info(`Matching engine initialized with ${openOrders.length} open orders`);
    } catch (error) {
      logger.error('Failed to initialize matching engine:', error);
      throw error;
    }
  }

  /**
   * Add order to the appropriate order book
   */
  addToOrderBook(order) {
    const pairId = order.trading_pair_id;
    
    if (!this.orderBooks.has(pairId)) {
      this.orderBooks.set(pairId, { bids: [], asks: [] });
    }

    const book = this.orderBooks.get(pairId);
    const side = order.side === 'buy' ? 'bids' : 'asks';
    
    const orderEntry = {
      id: order.id,
      userId: order.user_id,
      price: parseFloat(order.price),
      quantity: parseFloat(order.quantity),
      filledQuantity: parseFloat(order.filled_quantity || 0),
      remainingQuantity: parseFloat(order.quantity) - parseFloat(order.filled_quantity || 0),
      type: order.type,
      side: order.side,
      createdAt: order.created_at
    };

    // Insert in sorted order (price-time priority)
    const insertIndex = this.findInsertIndex(book[side], orderEntry, order.side);
    book[side].splice(insertIndex, 0, orderEntry);
  }

  /**
   * Find insert index maintaining price-time priority
   */
  findInsertIndex(orders, newOrder, side) {
    for (let i = 0; i < orders.length; i++) {
      const existing = orders[i];
      
      if (side === 'buy') {
        // Bids: highest price first, then earliest time
        if (newOrder.price > existing.price) return i;
        if (newOrder.price === existing.price && newOrder.createdAt < existing.createdAt) return i;
      } else {
        // Asks: lowest price first, then earliest time
        if (newOrder.price < existing.price) return i;
        if (newOrder.price === existing.price && newOrder.createdAt < existing.createdAt) return i;
      }
    }
    return orders.length;
  }

  /**
   * Remove order from order book
   */
  removeFromOrderBook(orderId, pairId) {
    const book = this.orderBooks.get(pairId);
    if (!book) return;

    for (const side of ['bids', 'asks']) {
      const index = book[side].findIndex(o => o.id === orderId);
      if (index !== -1) {
        book[side].splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Process a new order - main entry point
   */
  async processOrder(order, client = null) {
    const useTransaction = !client;
    const dbClient = client || await db.getClient();

    try {
      if (useTransaction) await dbClient.query('BEGIN');

      // Get trading pair info
      const { rows: [pair] } = await dbClient.query(
        'SELECT * FROM trading_pairs WHERE id = $1',
        [order.trading_pair_id]
      );

      if (!pair) {
        throw new Error('Trading pair not found');
      }

      let result;

      switch (order.type) {
        case 'market':
          result = await this.processMarketOrder(order, pair, dbClient);
          break;
        case 'limit':
          result = await this.processLimitOrder(order, pair, dbClient);
          break;
        case 'stop_loss':
        case 'take_profit':
        case 'stop_limit':
          result = await this.processConditionalOrder(order, pair, dbClient);
          break;
        default:
          throw new Error(`Unknown order type: ${order.type}`);
      }

      if (useTransaction) await dbClient.query('COMMIT');

      // Emit events for WebSocket broadcasting
      this.emit('orderProcessed', { order: result.order, trades: result.trades });
      
      if (result.trades.length > 0) {
        this.emit('tradesExecuted', { pairId: pair.id, trades: result.trades });
      }

      return result;
    } catch (error) {
      if (useTransaction) await dbClient.query('ROLLBACK');
      logger.error('Order processing failed:', error);
      throw error;
    } finally {
      if (useTransaction) dbClient.release();
    }
  }

  /**
   * Process market order - execute immediately at best available price
   */
  async processMarketOrder(order, pair, client) {
    const book = this.orderBooks.get(pair.id) || { bids: [], asks: [] };
    const oppositeSide = order.side === 'buy' ? 'asks' : 'bids';
    const availableOrders = [...book[oppositeSide]];

    const trades = [];
    let remainingQuantity = parseFloat(order.quantity);
    let totalCost = 0;
    let filledQuantity = 0;

    // Match against available orders
    for (const matchOrder of availableOrders) {
      if (remainingQuantity <= 0) break;

      const matchQuantity = Math.min(remainingQuantity, matchOrder.remainingQuantity);
      const matchPrice = matchOrder.price;
      const matchCost = matchQuantity * matchPrice;

      // Create trade
      const trade = await this.createTrade({
        buyOrderId: order.side === 'buy' ? order.id : matchOrder.id,
        sellOrderId: order.side === 'sell' ? order.id : matchOrder.id,
        buyerId: order.side === 'buy' ? order.user_id : matchOrder.userId,
        sellerId: order.side === 'sell' ? order.user_id : matchOrder.userId,
        tradingPairId: pair.id,
        price: matchPrice,
        quantity: matchQuantity,
        baseCurrencyId: pair.base_currency_id,
        quoteCurrencyId: pair.quote_currency_id
      }, client);

      trades.push(trade);

      // Update matched order
      await this.updateOrderFill(matchOrder.id, matchQuantity, client);

      // Update in-memory order book
      matchOrder.remainingQuantity -= matchQuantity;
      if (matchOrder.remainingQuantity <= 0) {
        this.removeFromOrderBook(matchOrder.id, pair.id);
      }

      remainingQuantity -= matchQuantity;
      filledQuantity += matchQuantity;
      totalCost += matchCost;
    }

    // Calculate average price
    const avgPrice = filledQuantity > 0 ? totalCost / filledQuantity : 0;

    // Update order status
    const status = remainingQuantity > 0 ? 
      (filledQuantity > 0 ? 'partially_filled' : 'cancelled') : 
      'filled';

    const updatedOrder = await this.updateOrderStatus(order.id, {
      status,
      filledQuantity,
      avgPrice,
      filledAt: status === 'filled' ? new Date() : null
    }, client);

    // If not fully filled, cancel remaining (market orders don't go on book)
    if (status === 'partially_filled') {
      await this.updateOrderStatus(order.id, { status: 'cancelled' }, client);
      updatedOrder.status = 'cancelled';
    }

    // Update user balances
    await this.updateBalancesFromTrades(trades, client);

    return { order: updatedOrder, trades };
  }

  /**
   * Process limit order - add to book or match immediately
   */
  async processLimitOrder(order, pair, client) {
    const book = this.orderBooks.get(pair.id) || { bids: [], asks: [] };
    const oppositeSide = order.side === 'buy' ? 'asks' : 'bids';
    
    const trades = [];
    let remainingQuantity = parseFloat(order.quantity);
    let filledQuantity = 0;
    let totalCost = 0;

    // Try to match with existing orders
    const availableOrders = [...book[oppositeSide]];
    
    for (const matchOrder of availableOrders) {
      if (remainingQuantity <= 0) break;

      // Check price compatibility
      const canMatch = order.side === 'buy' 
        ? order.price >= matchOrder.price
        : order.price <= matchOrder.price;

      if (!canMatch) break; // No more matches possible (book is sorted)

      const matchQuantity = Math.min(remainingQuantity, matchOrder.remainingQuantity);
      const matchPrice = matchOrder.price; // Price-time priority: maker's price

      // Create trade
      const trade = await this.createTrade({
        buyOrderId: order.side === 'buy' ? order.id : matchOrder.id,
        sellOrderId: order.side === 'sell' ? order.id : matchOrder.id,
        buyerId: order.side === 'buy' ? order.user_id : matchOrder.userId,
        sellerId: order.side === 'sell' ? order.user_id : matchOrder.userId,
        tradingPairId: pair.id,
        price: matchPrice,
        quantity: matchQuantity,
        baseCurrencyId: pair.base_currency_id,
        quoteCurrencyId: pair.quote_currency_id
      }, client);

      trades.push(trade);

      // Update matched order
      await this.updateOrderFill(matchOrder.id, matchQuantity, client);

      // Update in-memory order book
      matchOrder.remainingQuantity -= matchQuantity;
      if (matchOrder.remainingQuantity <= 0) {
        this.removeFromOrderBook(matchOrder.id, pair.id);
      }

      remainingQuantity -= matchQuantity;
      filledQuantity += matchQuantity;
      totalCost += matchQuantity * matchPrice;
    }

    // Determine order status
    let status;
    if (remainingQuantity <= 0) {
      status = 'filled';
    } else if (filledQuantity > 0) {
      status = 'partially_filled';
    } else {
      status = 'open';
    }

    const avgPrice = filledQuantity > 0 ? totalCost / filledQuantity : parseFloat(order.price);

    // Update order
    const updatedOrder = await this.updateOrderStatus(order.id, {
      status,
      filledQuantity,
      avgPrice,
      filledAt: status === 'filled' ? new Date() : null
    }, client);

    // Add remaining to order book if not fully filled
    if (status === 'open' || status === 'partially_filled') {
      this.addToOrderBook({
        ...order,
        quantity: order.quantity,
        filled_quantity: filledQuantity
      });
    }

    // Update user balances
    if (trades.length > 0) {
      await this.updateBalancesFromTrades(trades, client);
    }

    return { order: updatedOrder, trades };
  }

  /**
   * Process conditional orders (stop-loss, take-profit, stop-limit)
   */
  async processConditionalOrder(order, pair, client) {
    // Conditional orders are added as pending, not matched immediately
    // They will be triggered when the price condition is met
    
    const updatedOrder = await this.updateOrderStatus(order.id, {
      status: 'pending',
      filledQuantity: 0
    }, client);

    return { order: updatedOrder, trades: [] };
  }

  /**
   * Check and trigger conditional orders based on price
   */
  async checkConditionalOrders(pairId, currentPrice) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Get pending conditional orders for this pair
      const { rows: pendingOrders } = await client.query(`
        SELECT * FROM orders
        WHERE trading_pair_id = $1
          AND status = 'pending'
          AND type IN ('stop_loss', 'take_profit', 'stop_limit')
        FOR UPDATE
      `, [pairId]);

      const triggeredOrders = [];

      for (const order of pendingOrders) {
        let shouldTrigger = false;
        const triggerPrice = parseFloat(order.trigger_price);

        switch (order.type) {
          case 'stop_loss':
            // Trigger when price falls below (for long) or rises above (for short)
            shouldTrigger = order.side === 'sell' 
              ? currentPrice <= triggerPrice
              : currentPrice >= triggerPrice;
            break;
          
          case 'take_profit':
            // Trigger when price rises above (for long) or falls below (for short)
            shouldTrigger = order.side === 'sell'
              ? currentPrice >= triggerPrice
              : currentPrice <= triggerPrice;
            break;
          
          case 'stop_limit':
            // Convert to limit order when trigger price is hit
            shouldTrigger = order.side === 'sell'
              ? currentPrice <= triggerPrice
              : currentPrice >= triggerPrice;
            break;
        }

        if (shouldTrigger) {
          // Convert conditional order to market/limit order and process
          if (order.type === 'stop_limit') {
            // Convert to limit order
            await client.query(
              'UPDATE orders SET type = $1, status = $2, triggered_at = NOW() WHERE id = $3',
              ['limit', 'open', order.id]
            );
            order.type = 'limit';
          } else {
            // Convert to market order
            await client.query(
              'UPDATE orders SET type = $1, status = $2, triggered_at = NOW() WHERE id = $3',
              ['market', 'open', order.id]
            );
            order.type = 'market';
          }

          triggeredOrders.push(order);
        }
      }

      await client.query('COMMIT');

      // Process triggered orders
      for (const order of triggeredOrders) {
        const { rows: [pair] } = await db.query(
          'SELECT * FROM trading_pairs WHERE id = $1',
          [order.trading_pair_id]
        );
        
        await this.processOrder(order, null);
        
        this.emit('orderTriggered', { order });
      }

      return triggeredOrders;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to check conditional orders:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a trade record
   */
  async createTrade(tradeData, client) {
    const {
      buyOrderId, sellOrderId, buyerId, sellerId,
      tradingPairId, price, quantity, baseCurrencyId, quoteCurrencyId
    } = tradeData;

    // Calculate fees (maker: 0.1%, taker: 0.2%)
    const makerFeeRate = 0.001;
    const takerFeeRate = 0.002;
    const quoteAmount = price * quantity;

    const { rows: [trade] } = await client.query(`
      INSERT INTO trades (
        id, buy_order_id, sell_order_id, buyer_id, seller_id,
        trading_pair_id, price, quantity, quote_amount,
        buyer_fee, seller_fee, buyer_fee_currency_id, seller_fee_currency_id,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
      )
      RETURNING *
    `, [
      generateUUID(),
      buyOrderId,
      sellOrderId,
      buyerId,
      sellerId,
      tradingPairId,
      price,
      quantity,
      quoteAmount,
      quoteAmount * takerFeeRate, // Taker fee for buyer
      quantity * makerFeeRate,     // Maker fee for seller (in base currency)
      quoteCurrencyId,
      baseCurrencyId
    ]);

    logger.info('Trade executed', {
      tradeId: trade.id,
      pair: tradingPairId,
      price,
      quantity,
      buyer: buyerId,
      seller: sellerId
    });

    return trade;
  }

  /**
   * Update order fill amount
   */
  async updateOrderFill(orderId, fillAmount, client) {
    const { rows: [order] } = await client.query(`
      UPDATE orders SET
        filled_quantity = filled_quantity + $1,
        status = CASE 
          WHEN filled_quantity + $1 >= quantity THEN 'filled'
          ELSE 'partially_filled'
        END,
        filled_at = CASE
          WHEN filled_quantity + $1 >= quantity THEN NOW()
          ELSE filled_at
        END,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [fillAmount, orderId]);

    return order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, updates, client) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.filledQuantity !== undefined) {
      setClauses.push(`filled_quantity = $${paramIndex++}`);
      values.push(updates.filledQuantity);
    }
    if (updates.avgPrice !== undefined) {
      setClauses.push(`avg_fill_price = $${paramIndex++}`);
      values.push(updates.avgPrice);
    }
    if (updates.filledAt !== undefined) {
      setClauses.push(`filled_at = $${paramIndex++}`);
      values.push(updates.filledAt);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(orderId);

    const { rows: [order] } = await client.query(`
      UPDATE orders SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return order;
  }

  /**
   * Update user balances from executed trades
   */
  async updateBalancesFromTrades(trades, client) {
    for (const trade of trades) {
      const quoteAmount = parseFloat(trade.quote_amount);
      const baseAmount = parseFloat(trade.quantity);
      const buyerFee = parseFloat(trade.buyer_fee);
      const sellerFee = parseFloat(trade.seller_fee);

      // Get currency IDs from trade (need to query order for currencies)
      const { rows: [orderInfo] } = await client.query(`
        SELECT tp.base_currency_id, tp.quote_currency_id
        FROM orders o
        JOIN trading_pairs tp ON o.trading_pair_id = tp.id
        WHERE o.id = $1
      `, [trade.buy_order_id]);

      // Buyer: deduct quote currency, receive base currency (minus fee)
      // Deduct quote from buyer
      await client.query(`
        UPDATE wallets SET
          locked_balance = locked_balance - $1,
          updated_at = NOW()
        WHERE user_id = $2 AND cryptocurrency_id = $3
      `, [quoteAmount + buyerFee, trade.buyer_id, orderInfo.quote_currency_id]);

      // Credit base to buyer
      await client.query(`
        UPDATE wallets SET
          balance = balance + $1,
          updated_at = NOW()
        WHERE user_id = $2 AND cryptocurrency_id = $3
      `, [baseAmount, trade.buyer_id, orderInfo.base_currency_id]);

      // Seller: deduct base currency, receive quote currency (minus fee)
      // Deduct base from seller
      await client.query(`
        UPDATE wallets SET
          locked_balance = locked_balance - $1,
          updated_at = NOW()
        WHERE user_id = $2 AND cryptocurrency_id = $3
      `, [baseAmount + sellerFee, trade.seller_id, orderInfo.base_currency_id]);

      // Credit quote to seller
      await client.query(`
        UPDATE wallets SET
          balance = balance + $1,
          updated_at = NOW()
        WHERE user_id = $2 AND cryptocurrency_id = $3
      `, [quoteAmount, trade.seller_id, orderInfo.quote_currency_id]);

      // Record fee collection
      await client.query(`
        INSERT INTO fee_collections (
          id, trade_id, user_id, amount, currency_id, fee_type, created_at
        ) VALUES 
        ($1, $2, $3, $4, $5, 'trading', NOW()),
        ($6, $2, $7, $8, $9, 'trading', NOW())
      `, [
        generateUUID(), trade.id, trade.buyer_id, buyerFee, orderInfo.quote_currency_id,
        generateUUID(), trade.seller_id, sellerFee, orderInfo.base_currency_id
      ]);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId, userId) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Get order with lock
      const { rows: [order] } = await client.query(`
        SELECT o.*, tp.base_currency_id, tp.quote_currency_id
        FROM orders o
        JOIN trading_pairs tp ON o.trading_pair_id = tp.id
        WHERE o.id = $1 AND o.user_id = $2
        FOR UPDATE
      `, [orderId, userId]);

      if (!order) {
        throw new Error('Order not found');
      }

      if (!['open', 'partially_filled', 'pending'].includes(order.status)) {
        throw new Error('Order cannot be cancelled');
      }

      // Calculate remaining locked amount to release
      const remainingQuantity = parseFloat(order.quantity) - parseFloat(order.filled_quantity);
      const currencyToRelease = order.side === 'buy' 
        ? order.quote_currency_id 
        : order.base_currency_id;
      const amountToRelease = order.side === 'buy'
        ? remainingQuantity * parseFloat(order.price)
        : remainingQuantity;

      // Update order status
      await client.query(`
        UPDATE orders SET
          status = 'cancelled',
          cancelled_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [orderId]);

      // Release locked balance
      await client.query(`
        UPDATE wallets SET
          balance = balance + $1,
          locked_balance = locked_balance - $1,
          updated_at = NOW()
        WHERE user_id = $2 AND cryptocurrency_id = $3
      `, [amountToRelease, userId, currencyToRelease]);

      // Remove from order book
      this.removeFromOrderBook(orderId, order.trading_pair_id);

      await client.query('COMMIT');

      this.emit('orderCancelled', { orderId, userId, pairId: order.trading_pair_id });

      return { success: true, releasedAmount: amountToRelease };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get order book snapshot
   */
  getOrderBookSnapshot(pairId, depth = 20) {
    const book = this.orderBooks.get(pairId);
    if (!book) {
      return { bids: [], asks: [], spread: null };
    }

    // Aggregate orders at same price level
    const aggregateSide = (orders) => {
      const levels = new Map();
      for (const order of orders) {
        const key = order.price.toFixed(8);
        if (!levels.has(key)) {
          levels.set(key, { price: order.price, quantity: 0, orders: 0 });
        }
        const level = levels.get(key);
        level.quantity += order.remainingQuantity;
        level.orders++;
      }
      return Array.from(levels.values()).slice(0, depth);
    };

    const bids = aggregateSide(book.bids);
    const asks = aggregateSide(book.asks);

    // Calculate spread
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || Infinity;
    const spread = bestAsk !== Infinity && bestBid !== 0 
      ? ((bestAsk - bestBid) / bestAsk * 100).toFixed(4)
      : null;

    return {
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      midPrice: bestBid && bestAsk !== Infinity ? (bestBid + bestAsk) / 2 : null
    };
  }

  /**
   * Get order book statistics
   */
  getOrderBookStats(pairId) {
    const book = this.orderBooks.get(pairId);
    if (!book) {
      return null;
    }

    const totalBidVolume = book.bids.reduce((sum, o) => sum + o.remainingQuantity, 0);
    const totalAskVolume = book.asks.reduce((sum, o) => sum + o.remainingQuantity, 0);
    const totalBidValue = book.bids.reduce((sum, o) => sum + o.remainingQuantity * o.price, 0);
    const totalAskValue = book.asks.reduce((sum, o) => sum + o.remainingQuantity * o.price, 0);

    return {
      bidOrders: book.bids.length,
      askOrders: book.asks.length,
      totalBidVolume,
      totalAskVolume,
      totalBidValue,
      totalAskValue,
      buyPressure: totalBidVolume / (totalBidVolume + totalAskVolume) || 0.5
    };
  }
}

// Export singleton instance
module.exports = new MatchingEngine();
