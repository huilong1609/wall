/**
 * WebSocket Service
 * Handles real-time data broadcasting, subscriptions, and client management
 */

const logger = require('../config/logger');
const { generateUUID } = require('../utils/helpers');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();      // clientId -> client info
    this.subscriptions = new Map(); // channel -> Set of clientIds
    this.userClients = new Map();   // userId -> Set of clientIds
    
    // Channel types
    this.channels = {
      TICKER: 'ticker',           // Price ticker updates
      ORDERBOOK: 'orderbook',     // Order book changes
      TRADES: 'trades',           // Recent trades
      CANDLES: 'candles',         // OHLCV data
      USER_ORDERS: 'user:orders', // User's order updates
      USER_TRADES: 'user:trades', // User's trade updates
      USER_BALANCE: 'user:balance', // Balance updates
      USER_NOTIFICATIONS: 'user:notifications', // Notifications
      MARKET: 'market'            // General market updates
    };

    // Rate limiting
    this.messageCounts = new Map();
    this.maxMessagesPerSecond = 100;
  }

  /**
   * Initialize WebSocket service with server
   */
  initialize(wss) {
    this.wss = wss;
    logger.info('WebSocket service initialized');
  }

  /**
   * Register a new client connection
   */
  registerClient(ws, userId = null) {
    const clientId = generateUUID();
    
    const clientInfo = {
      id: clientId,
      ws,
      userId,
      subscriptions: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0
    };

    this.clients.set(clientId, clientInfo);

    // Track by user ID if authenticated
    if (userId) {
      if (!this.userClients.has(userId)) {
        this.userClients.set(userId, new Set());
      }
      this.userClients.get(userId).add(clientId);
    }

    logger.debug('WebSocket client registered', { clientId, userId });

    return clientId;
  }

  /**
   * Unregister client on disconnect
   */
  unregisterClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscriptions
    for (const channel of client.subscriptions) {
      const subs = this.subscriptions.get(channel);
      if (subs) {
        subs.delete(clientId);
        if (subs.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    }

    // Remove from user tracking
    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    this.clients.delete(clientId);
    logger.debug('WebSocket client unregistered', { clientId });
  }

  /**
   * Update client's user ID (after authentication)
   */
  authenticateClient(clientId, userId) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    // Remove from old user tracking if exists
    if (client.userId && client.userId !== userId) {
      const oldUserClients = this.userClients.get(client.userId);
      if (oldUserClients) {
        oldUserClients.delete(clientId);
      }
    }

    client.userId = userId;

    // Add to new user tracking
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId).add(clientId);

    logger.debug('WebSocket client authenticated', { clientId, userId });
    return true;
  }

  /**
   * Subscribe client to a channel
   */
  subscribe(clientId, channel, params = {}) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    // Build channel key with params
    const channelKey = this.buildChannelKey(channel, params);

    // Add to subscriptions map
    if (!this.subscriptions.has(channelKey)) {
      this.subscriptions.set(channelKey, new Set());
    }
    this.subscriptions.get(channelKey).add(clientId);

    // Track client's subscriptions
    client.subscriptions.add(channelKey);

    logger.debug('Client subscribed to channel', { clientId, channel: channelKey });

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'subscribed',
      channel: channelKey,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * Unsubscribe client from a channel
   */
  unsubscribe(clientId, channel, params = {}) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    const channelKey = this.buildChannelKey(channel, params);

    // Remove from subscriptions map
    const subs = this.subscriptions.get(channelKey);
    if (subs) {
      subs.delete(clientId);
      if (subs.size === 0) {
        this.subscriptions.delete(channelKey);
      }
    }

    // Remove from client's subscriptions
    client.subscriptions.delete(channelKey);

    logger.debug('Client unsubscribed from channel', { clientId, channel: channelKey });

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel: channelKey,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * Build channel key from channel name and params
   */
  buildChannelKey(channel, params = {}) {
    if (Object.keys(params).length === 0) {
      return channel;
    }
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${channel}:${paramStr}`;
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== 1) return false;

    // Rate limiting
    if (!this.checkRateLimit(clientId)) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(data));
      client.lastActivity = new Date();
      client.messageCount++;
      return true;
    } catch (error) {
      logger.error('Failed to send WebSocket message', { clientId, error: error.message });
      return false;
    }
  }

  /**
   * Broadcast to all subscribers of a channel
   */
  broadcast(channel, data, params = {}) {
    const channelKey = this.buildChannelKey(channel, params);
    const subscribers = this.subscriptions.get(channelKey);

    if (!subscribers || subscribers.size === 0) {
      return 0;
    }

    const message = {
      type: 'update',
      channel: channelKey,
      data,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    for (const clientId of subscribers) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Send to all clients of a specific user
   */
  sendToUser(userId, data) {
    const clientIds = this.userClients.get(userId);
    if (!clientIds || clientIds.size === 0) {
      return 0;
    }

    let sentCount = 0;
    for (const clientId of clientIds) {
      if (this.sendToClient(clientId, data)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(data) {
    let sentCount = 0;
    for (const [clientId] of this.clients) {
      if (this.sendToClient(clientId, data)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  /**
   * Check rate limit for client
   */
  checkRateLimit(clientId) {
    const now = Date.now();
    const windowStart = now - 1000;

    if (!this.messageCounts.has(clientId)) {
      this.messageCounts.set(clientId, []);
    }

    const counts = this.messageCounts.get(clientId);
    
    // Remove old entries
    while (counts.length > 0 && counts[0] < windowStart) {
      counts.shift();
    }

    if (counts.length >= this.maxMessagesPerSecond) {
      return false;
    }

    counts.push(now);
    return true;
  }

  // ============================================
  // Specific broadcast methods for different data types
  // ============================================

  /**
   * Broadcast ticker update
   */
  broadcastTicker(pairSymbol, tickerData) {
    return this.broadcast(this.channels.TICKER, tickerData, { pair: pairSymbol });
  }

  /**
   * Broadcast order book update
   */
  broadcastOrderBook(pairSymbol, orderBookData) {
    return this.broadcast(this.channels.ORDERBOOK, orderBookData, { pair: pairSymbol });
  }

  /**
   * Broadcast new trade
   */
  broadcastTrade(pairSymbol, tradeData) {
    return this.broadcast(this.channels.TRADES, tradeData, { pair: pairSymbol });
  }

  /**
   * Broadcast candle update
   */
  broadcastCandle(pairSymbol, interval, candleData) {
    return this.broadcast(this.channels.CANDLES, candleData, { pair: pairSymbol, interval });
  }

  /**
   * Send order update to user
   */
  sendOrderUpdate(userId, orderData) {
    return this.sendToUser(userId, {
      type: 'order_update',
      channel: this.channels.USER_ORDERS,
      data: orderData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send trade notification to user
   */
  sendTradeNotification(userId, tradeData) {
    return this.sendToUser(userId, {
      type: 'trade_executed',
      channel: this.channels.USER_TRADES,
      data: tradeData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send balance update to user
   */
  sendBalanceUpdate(userId, balanceData) {
    return this.sendToUser(userId, {
      type: 'balance_update',
      channel: this.channels.USER_BALANCE,
      data: balanceData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send notification to user
   */
  sendNotification(userId, notification) {
    return this.sendToUser(userId, {
      type: 'notification',
      channel: this.channels.USER_NOTIFICATIONS,
      data: notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast market-wide update
   */
  broadcastMarketUpdate(marketData) {
    return this.broadcast(this.channels.MARKET, marketData);
  }

  /**
   * Send price alert triggered notification
   */
  sendPriceAlertTriggered(userId, alertData) {
    return this.sendToUser(userId, {
      type: 'price_alert_triggered',
      channel: this.channels.USER_NOTIFICATIONS,
      data: alertData,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================
  // Connection management
  // ============================================

  /**
   * Get connection stats
   */
  getStats() {
    const stats = {
      totalClients: this.clients.size,
      authenticatedClients: 0,
      uniqueUsers: this.userClients.size,
      subscriptions: {},
      channelCounts: {}
    };

    for (const [, client] of this.clients) {
      if (client.userId) {
        stats.authenticatedClients++;
      }
    }

    for (const [channel, subs] of this.subscriptions) {
      stats.channelCounts[channel] = subs.size;
    }

    return stats;
  }

  /**
   * Get client info
   */
  getClientInfo(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return null;

    return {
      id: client.id,
      userId: client.userId,
      subscriptions: Array.from(client.subscriptions),
      connectedAt: client.connectedAt,
      lastActivity: client.lastActivity,
      messageCount: client.messageCount
    };
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(maxIdleMs = 5 * 60 * 1000) {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [clientId, client] of this.clients) {
      const idleTime = now - client.lastActivity.getTime();
      
      if (idleTime > maxIdleMs || client.ws.readyState !== 1) {
        this.unregisterClient(clientId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} stale WebSocket connections`);
    }

    return cleanedCount;
  }

  /**
   * Ping all clients to keep connections alive
   */
  pingClients() {
    const pingMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() });
    
    for (const [, client] of this.clients) {
      if (client.ws.readyState === 1) {
        try {
          client.ws.send(pingMessage);
        } catch (error) {
          // Will be cleaned up by cleanup routine
        }
      }
    }
  }

  /**
   * Handle incoming message from client
   */
  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          this.subscribe(clientId, data.channel, data.params || {});
          break;

        case 'unsubscribe':
          this.unsubscribe(clientId, data.channel, data.params || {});
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;

        case 'pong':
          // Client responded to ping
          break;

        default:
          logger.warn('Unknown WebSocket message type', { clientId, type: data.type });
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message', { clientId, error: error.message });
      this.sendToClient(clientId, { type: 'error', message: 'Invalid message format' });
    }
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(reason = 'Server shutting down') {
    const message = JSON.stringify({
      type: 'disconnect',
      reason,
      timestamp: new Date().toISOString()
    });

    for (const [, client] of this.clients) {
      try {
        client.ws.send(message);
        client.ws.close(1001, reason);
      } catch (error) {
        // Ignore errors during shutdown
      }
    }

    this.clients.clear();
    this.subscriptions.clear();
    this.userClients.clear();
    this.messageCounts.clear();

    logger.info('All WebSocket clients disconnected');
  }
}

// Export singleton instance
module.exports = new WebSocketService();
