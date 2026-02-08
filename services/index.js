/**
 * Services Index
 * Export all services for easy importing
 */

const emailService = require('./email.service');
const priceService = require('./price.service');
const matchingService = require('./matching.service');
const calculationService = require('./calculation.service');
const websocketService = require('./websocket.service');
const cronService = require('./cron.service');
const uploadService = require('./upload.service');
const userService = require('./userService');
const tradeService = require('./tradeService');
const walletService = require('./walletService');
const marketService = require('./marketService');
const notificationService = require('./notificationService');
const alertService = require('./alertService');
const stakingService = require('./stakingService');
const referralService = require('./referralService');
const supportService = require('./supportService');
const copyTradingService = require('./copyTradingService');
const kycService = require('./kycService');
const apiKeyService = require('./apiKeyService');

module.exports = {
  emailService,
  priceService,
  matchingService,
  calculationService,
  websocketService,
  cronService,
  uploadService,
  userService,
  tradeService,
  walletService,
  marketService,
  notificationService,
  alertService,
  stakingService,
  referralService,
  supportService,
  copyTradingService,
  kycService,
  apiKeyService,
};
