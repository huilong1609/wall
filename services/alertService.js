const { Op } = require('sequelize');
const { PriceAlert, TradingPair } = require('../models');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const notificationService = require('./notificationService');

class AlertService {
  /**
   * Get all alerts for a user
   */
  async getAlerts(userId, filters = {}) {
    const { symbol, status, page = 1, limit = 20 } = filters;

    const where = { userId };
    if (symbol) where.symbol = symbol.toUpperCase();
    if (status) where.status = status;

    const { count, rows } = await PriceAlert.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      alerts: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  /**
   * Get alert by ID
   */
  async getAlertById(userId, alertId) {
    const alert = await PriceAlert.findOne({
      where: { id: alertId, userId },
    });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    return alert;
  }

  /**
   * Create price alert
   */
  async createAlert(userId, alertData) {
    const { symbol, condition, targetPrice, note, channels, recurring, expiresAt } = alertData;

    // Verify trading pair exists
    const pair = await TradingPair.findOne({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!pair) {
      throw new BadRequestError('Invalid trading pair');
    }

    const alert = await PriceAlert.create({
      userId,
      symbol: symbol.toUpperCase(),
      condition,
      targetPrice,
      currentPrice: pair.price,
      note,
      channels: channels || { email: true, push: true, sms: false },
      recurring: recurring || false,
      expiresAt,
    });

    return alert;
  }

  /**
   * Update alert
   */
  async updateAlert(userId, alertId, updates) {
    const alert = await this.getAlertById(userId, alertId);

    const allowedUpdates = ['targetPrice', 'note', 'channels', 'recurring', 'expiresAt'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    await alert.update(filteredUpdates);

    return alert;
  }

  /**
   * Delete alert
   */
  async deleteAlert(userId, alertId) {
    const alert = await this.getAlertById(userId, alertId);
    await alert.destroy();
    return { deleted: true };
  }

  /**
   * Toggle alert status
   */
  async toggleAlert(userId, alertId) {
    const alert = await this.getAlertById(userId, alertId);

    const newStatus = alert.status === 'active' ? 'cancelled' : 'active';
    await alert.update({ status: newStatus });

    return alert;
  }

  /**
   * Check and trigger alerts (called by cron job)
   */
  async checkAlerts() {
    const activeAlerts = await PriceAlert.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } },
        ],
      },
    });

    const triggeredAlerts = [];

    for (const alert of activeAlerts) {
      const pair = await TradingPair.findOne({
        where: { symbol: alert.symbol },
      });

      if (!pair) continue;

      const currentPrice = parseFloat(pair.price);
      const targetPrice = parseFloat(alert.targetPrice);
      let shouldTrigger = false;

      switch (alert.condition) {
        case 'above':
          shouldTrigger = currentPrice >= targetPrice;
          break;
        case 'below':
          shouldTrigger = currentPrice <= targetPrice;
          break;
        case 'crosses':
          const previousPrice = parseFloat(alert.currentPrice);
          shouldTrigger = 
            (previousPrice < targetPrice && currentPrice >= targetPrice) ||
            (previousPrice > targetPrice && currentPrice <= targetPrice);
          break;
      }

      if (shouldTrigger) {
        await alert.trigger(currentPrice);
        await notificationService.createPriceAlertNotification(alert.userId, alert, currentPrice);
        triggeredAlerts.push(alert);
      } else {
        // Update current price for next check
        await alert.update({ currentPrice });
      }
    }

    return triggeredAlerts;
  }

  /**
   * Get alert statistics
   */
  async getStatistics(userId) {
    const [total, active, triggered] = await Promise.all([
      PriceAlert.count({ where: { userId } }),
      PriceAlert.count({ where: { userId, status: 'active' } }),
      PriceAlert.count({ where: { userId, status: 'triggered' } }),
    ]);

    return { total, active, triggered, cancelled: total - active - triggered };
  }
}

module.exports = new AlertService();
