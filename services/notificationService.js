const { Op } = require('sequelize');
const { Notification } = require('../models');
const { NotFoundError } = require('../utils/errors');

class NotificationService {
  /**
   * Get notifications for a user
   */
  async getNotifications(userId, filters = {}) {
    const { type, read, page = 1, limit = 20 } = filters;

    const where = { userId };
    if (type) where.type = type;
    if (read !== undefined) where.read = read === 'true' || read === true;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    const unreadCount = await Notification.count({
      where: { userId, read: false },
    });

    const totalCount = await Notification.count({
      where: {userId},
    });


    return {
      unreadCount: unreadCount,
      totalCount: totalCount,
      notifications: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(userId, notificationId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const count = await Notification.count({
      where: { userId, read: false },
    });
    return count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId, notificationId) {
    const notification = await this.getNotificationById(userId, notificationId);
    await notification.markAsRead();
    return notification;
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    const result = await Notification.update(
      { read: true, readAt: new Date() },
      { where: { userId, read: false } }
    );
    return { updated: result[0] };
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId, notificationId) {
    const notification = await this.getNotificationById(userId, notificationId);
    await notification.destroy();
    return { deleted: true };
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(userId) {
    const result = await Notification.destroy({ where: { userId } });
    return { deleted: result };
  }

  /**
   * Create notification
   */
  async createNotification(userId, data) {
    const notification = await Notification.create({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      icon: data.icon,
      color: data.color,
      link: data.link,
      priority: data.priority || 'medium',
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      metadata: data.metadata,
    });

    return notification;
  }

  /**
   * Create order notification
   */
  async createOrderNotification(userId, order, status) {
    const titles = {
      filled: 'Order Filled',
      partially_filled: 'Order Partially Filled',
      cancelled: 'Order Cancelled',
      rejected: 'Order Rejected',
    };

    return this.createNotification(userId, {
      type: 'order',
      title: titles[status] || 'Order Update',
      message: `Your ${order.side} order for ${order.symbol} has been ${status}`,
      icon: 'ShoppingCart',
      color: status === 'filled' ? 'green' : status === 'cancelled' ? 'red' : 'yellow',
      link: `/user/portfolio/orders/${order.id}`,
      relatedId: order.id,
      relatedType: 'order',
    });
  }

  /**
   * Create trade notification
   */
  async createTradeNotification(userId, trade) {
    return this.createNotification(userId, {
      type: 'trade',
      title: 'Trade Executed',
      message: `${trade.side.toUpperCase()} ${trade.quantity} ${trade.symbol} at ${trade.price}`,
      icon: 'TrendingUp',
      color: trade.side === 'buy' ? 'green' : 'red',
      link: `/user/portfolio/trades/${trade.id}`,
      relatedId: trade.id,
      relatedType: 'trade',
    });
  }

  /**
   * Create deposit notification
   */
  async createDepositNotification(userId, transaction) {
    return this.createNotification(userId, {
      type: 'deposit',
      title: 'Deposit Received',
      message: `${transaction.amount} ${transaction.currency} has been credited to your account`,
      icon: 'Download',
      color: 'green',
      link: `/user/wallet/transactions/${transaction.id}`,
      priority: 'high',
      relatedId: transaction.id,
      relatedType: 'transaction',
    });
  }

  /**
   * Create withdrawal notification
   */
  async createWithdrawalNotification(userId, transaction, status) {
    const messages = {
      processing: `Your withdrawal of ${transaction.amount} ${transaction.currency} is being processed`,
      completed: `Your withdrawal of ${transaction.amount} ${transaction.currency} has been completed`,
      failed: `Your withdrawal of ${transaction.amount} ${transaction.currency} has failed`,
    };

    return this.createNotification(userId, {
      type: 'withdrawal',
      title: `Withdrawal ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: messages[status],
      icon: 'Upload',
      color: status === 'completed' ? 'green' : status === 'failed' ? 'red' : 'yellow',
      link: `/user/wallet/transactions/${transaction.id}`,
      priority: 'high',
      relatedId: transaction.id,
      relatedType: 'transaction',
    });
  }

  /**
   * Create security notification
   */
  async createSecurityNotification(userId, event, details = {}) {
    const events = {
      login: { title: 'New Login', message: `New login from ${details.ip || 'unknown'}` },
      password_changed: { title: 'Password Changed', message: 'Your password has been changed' },
      '2fa_enabled': { title: '2FA Enabled', message: 'Two-factor authentication has been enabled' },
      '2fa_disabled': { title: '2FA Disabled', message: 'Two-factor authentication has been disabled' },
      api_key_created: { title: 'API Key Created', message: `New API key "${details.name}" has been created` },
    };

    const eventData = events[event] || { title: 'Security Alert', message: event };

    return this.createNotification(userId, {
      type: 'security',
      title: eventData.title,
      message: eventData.message,
      icon: 'Shield',
      color: 'blue',
      priority: 'high',
      metadata: details,
    });
  }

  /**
   * Create price alert notification
   */
  async createPriceAlertNotification(userId, alert, currentPrice) {
    return this.createNotification(userId, {
      type: 'price_alert',
      title: 'Price Alert Triggered',
      message: `${alert.symbol} is now ${alert.condition} ${alert.targetPrice} (Current: ${currentPrice})`,
      icon: 'Bell',
      color: 'yellow',
      link: `/user/alerts/${alert.id}`,
      relatedId: alert.id,
      relatedType: 'price_alert',
    });
  }
}

module.exports = new NotificationService();
