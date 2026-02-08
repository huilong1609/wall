const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM(
        'order', 'trade', 'deposit', 'withdrawal', 'transfer',
        'price_alert', 'security', 'system', 'promo', 'referral',
        'staking', 'copy_trade', 'verification', 'support'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING(50),
    },
    color: {
      type: DataTypes.STRING(20),
    },
    link: {
      type: DataTypes.STRING(500),
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      field: 'read_at',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
    },
    channels: {
      type: DataTypes.JSONB,
      defaultValue: { inApp: true, email: false, push: false, sms: false },
    },
    emailSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'email_sent',
    },
    emailSentAt: {
      type: DataTypes.DATE,
      field: 'email_sent_at',
    },
    pushSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'push_sent',
    },
    pushSentAt: {
      type: DataTypes.DATE,
      field: 'push_sent_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at',
    },
    relatedId: {
      type: DataTypes.UUID,
      field: 'related_id',
    },
    relatedType: {
      type: DataTypes.STRING(50),
      field: 'related_type',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'created_at'] },
      { fields: ['user_id', 'read'] },
      { fields: ['type'] },
      { fields: ['priority'] },
    ],
  });

  // Instance Methods
  Notification.prototype.markAsRead = async function () {
    this.read = true;
    this.readAt = new Date();
    return this.save();
  };

  // Class Methods
  Notification.markAllAsRead = async function (userId) {
    return this.update(
      { read: true, readAt: new Date() },
      { where: { userId, read: false } }
    );
  };

  Notification.getUnreadCount = async function (userId) {
    return this.count({ where: { userId, read: false } });
  };

  return Notification;
};
