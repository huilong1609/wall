const { DataTypes } = require('sequelize');
const { generateTicketId } = require('../utils/helpers');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticketId: {
      type: DataTypes.STRING(20),
      unique: true,
      defaultValue: () => generateTicketId(),
      field: 'ticket_id',
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
    category: {
      type: DataTypes.ENUM(
        'account', 'trading', 'deposits', 'withdrawals',
        'verification', 'security', 'technical', 'other'
      ),
      allowNull: false,
    },
    subcategory: {
      type: DataTypes.STRING(100),
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('open', 'pending', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'open',
    },
    assignedTo: {
      type: DataTypes.UUID,
      field: 'assigned_to',
    },
    orderId: {
      type: DataTypes.STRING(50),
      field: 'order_id',
    },
    transactionId: {
      type: DataTypes.STRING(50),
      field: 'transaction_id',
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    lastReplyBy: {
      type: DataTypes.ENUM('user', 'support'),
      field: 'last_reply_by',
    },
    lastReplyAt: {
      type: DataTypes.DATE,
      field: 'last_reply_at',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      field: 'resolved_at',
    },
    closedAt: {
      type: DataTypes.DATE,
      field: 'closed_at',
    },
    rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5,
      },
    },
    ratingComment: {
      type: DataTypes.TEXT,
      field: 'rating_comment',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'tickets',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['ticket_id'] },
      { fields: ['status'] },
      { fields: ['category'] },
      { fields: ['priority'] },
      { fields: ['assigned_to'] },
    ],
  });

  return Ticket;
};

// TicketMessage model
module.exports.TicketMessageModel = (sequelize) => {
  const TicketMessage = sequelize.define('TicketMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ticket_id',
      references: {
        model: 'tickets',
        key: 'id',
      },
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sender_id',
    },
    senderType: {
      type: DataTypes.ENUM('user', 'support'),
      allowNull: false,
      field: 'sender_type',
    },
    senderName: {
      type: DataTypes.STRING(100),
      field: 'sender_name',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    isInternal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_internal',
    },
  }, {
    tableName: 'ticket_messages',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['sender_id'] },
    ],
  });

  return TicketMessage;
};
