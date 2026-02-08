/**
 * ============================================
 * WEBSOCKET SERVER CONFIGURATION
 * ============================================
 * Real-time updates for trading, prices, and notifications
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let wss = null;
const clients = new Map(); // userId -> Set of WebSocket connections

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server instance
 */
function initializeWebSocket(server) {
  wss = new WebSocket.Server({ 
    server,
    path: '/ws',
  });

  wss.on('connection', handleConnection);

  // Heartbeat interval to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  logger.info('WebSocket server initialized');
  return wss;
}

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} request - HTTP request
 */
function handleConnection(ws, request) {
  ws.isAlive = true;
  ws.userId = null;
  ws.subscriptions = new Set();

  // Handle pong response
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    if (ws.userId) {
      const userConnections = clients.get(ws.userId);
      if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
          clients.delete(ws.userId);
        }
      }
    }
    logger.debug(`WebSocket connection closed for user: ${ws.userId || 'anonymous'}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to CryptoTrade WebSocket',
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Handle incoming WebSocket message
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Parsed message
 */
function handleMessage(ws, message) {
  const { type, payload } = message;

  switch (type) {
    case 'authenticate':
      handleAuthentication(ws, payload);
      break;
    case 'subscribe':
      handleSubscribe(ws, payload);
      break;
    case 'unsubscribe':
      handleUnsubscribe(ws, payload);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

/**
 * Handle WebSocket authentication
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - Authentication payload
 */
function handleAuthentication(ws, payload) {
  try {
    const { token } = payload;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    ws.userId = decoded.userId;
    
    // Add to clients map
    if (!clients.has(ws.userId)) {
      clients.set(ws.userId, new Set());
    }
    clients.get(ws.userId).add(ws);
    
    ws.send(JSON.stringify({ 
      type: 'authenticated', 
      userId: ws.userId,
      timestamp: new Date().toISOString(),
    }));
    
    logger.debug(`WebSocket authenticated for user: ${ws.userId}`);
  } catch (error) {
    ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
  }
}

/**
 * Handle subscription request
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - Subscription payload
 */
function handleSubscribe(ws, payload) {
  const { channels } = payload;
  if (Array.isArray(channels)) {
    channels.forEach(channel => ws.subscriptions.add(channel));
    ws.send(JSON.stringify({ 
      type: 'subscribed', 
      channels: Array.from(ws.subscriptions),
    }));
  }
}

/**
 * Handle unsubscription request
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - Unsubscription payload
 */
function handleUnsubscribe(ws, payload) {
  const { channels } = payload;
  if (Array.isArray(channels)) {
    channels.forEach(channel => ws.subscriptions.delete(channel));
    ws.send(JSON.stringify({ 
      type: 'unsubscribed', 
      channels,
    }));
  }
}

/**
 * Broadcast message to all connected clients
 * @param {string} channel - Channel name
 * @param {Object} data - Data to broadcast
 */
function broadcast(channel, data) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'broadcast',
    channel,
    data,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && ws.subscriptions.has(channel)) {
      ws.send(message);
    }
  });
}

/**
 * Send message to specific user
 * @param {string} userId - Target user ID
 * @param {string} type - Message type
 * @param {Object} data - Data to send
 */
function sendToUser(userId, type, data) {
  const userConnections = clients.get(userId);
  if (!userConnections) return;

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  userConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

/**
 * Broadcast price update
 * @param {Object} priceData - Price update data
 */
function broadcastPriceUpdate(priceData) {
  broadcast('prices', priceData);
}

/**
 * Broadcast order book update
 * @param {string} pair - Trading pair
 * @param {Object} orderBookData - Order book data
 */
function broadcastOrderBook(pair, orderBookData) {
  broadcast(`orderbook:${pair}`, orderBookData);
}

/**
 * Send trade notification to user
 * @param {string} userId - User ID
 * @param {Object} tradeData - Trade data
 */
function sendTradeNotification(userId, tradeData) {
  sendToUser(userId, 'trade', tradeData);
}

/**
 * Send notification to user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 */
function sendNotification(userId, notification) {
  sendToUser(userId, 'notification', notification);
}

module.exports = {
  initializeWebSocket,
  broadcast,
  sendToUser,
  broadcastPriceUpdate,
  broadcastOrderBook,
  sendTradeNotification,
  sendNotification,
};
