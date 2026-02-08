require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
/* const { Server } = require('socket.io'); */
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

 const config = require('./config');
const { connectDB, sequelize } = require('./config/database');
const routes = require('./routes');
const { convertError, errorHandler, notFound } = require('./middleware/errorHandler');
//const { defaultLimiter } = require('./middleware/rateLimiter'); 
const logger = require('./utils/logger'); 

// Initialize Express app
const app = express();
const httpServer = createServer(app);


// Initialize Socket.IO
/* const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
}); */

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:5174'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Secret'],
}));


app.use(compression());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));



// Request Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate Limiting
 //app.use('/api', defaultLimiter);
/*
// API Routes
app.use(`/api/${config.apiVersion}`, routes);
 */
app.post("/test-json", (req, res) => {
  res.json({
    body: req.body,
  });
});

app.use(`${API_PREFIX}`, routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Trading Platform API',
    version: config.apiVersion,
    status: 'running',
    documentation: `/api/${config.apiVersion}/docs`,
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// 404 Handler
 app.use(notFound);

// Error Handlers
app.use(convertError);
app.use(errorHandler);

// Socket.IO Connection Handler
/* io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join user room for personalized updates
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      logger.debug(`Socket ${socket.id} joined room user:${userId}`);
    }
  });

  // Subscribe to market data
  socket.on('subscribe', (channel) => {
    socket.join(channel);
    logger.debug(`Socket ${socket.id} subscribed to ${channel}`);
  });

  // Unsubscribe from market data
  socket.on('unsubscribe', (channel) => {
    socket.leave(channel);
    logger.debug(`Socket ${socket.id} unsubscribed from ${channel}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io); */

// Database Connection and Server Start
const startServer = async () => {
  try {
    // Connect to PostgreSQL
     await connectDB();

   /* // Sync database (development only)
    if (config.env === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    } */

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
      logger.info(`API available at http://localhost:${config.port}/api/${config.apiVersion}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Close HTTP server
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    // Close database connection
    await sequelize.close();
    logger.info('Database connection closed');

    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

module.exports = { app, httpServer };