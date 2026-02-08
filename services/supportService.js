const { Op } = require('sequelize');
const { Ticket, TicketMessage, User } = require('../models');
const { generateTicketId } = require('../utils/helpers');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class SupportService {
  /**
   * Get tickets for user
   */
  async getTickets(userId, filters = {}) {
    const { category, status, priority, page = 1, limit = 20 } = filters;

    const where = { userId };
    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const { count, rows } = await Ticket.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      tickets: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(userId, ticketId) {
    const ticket = await Ticket.findOne({
      where: { id: ticketId, userId },
      include: [{
        model: TicketMessage,
        as: 'messages',
        order: [['createdAt', 'ASC']],
      }],
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    return ticket;
  }

  /**
   * Create ticket
   */
  async createTicket(userId, ticketData) {
    const user = await User.findByPk(userId);
    
    const ticket = await Ticket.create({
      ticketId: generateTicketId(),
      userId,
      category: ticketData.category,
      subcategory: ticketData.subcategory,
      subject: ticketData.subject,
      description: ticketData.description,
      priority: ticketData.priority || 'medium',
      orderId: ticketData.orderId,
      transactionId: ticketData.transactionId,
      attachments: ticketData.attachments || [],
    });

    // Create initial message
    await TicketMessage.create({
      ticketId: ticket.id,
      senderId: userId,
      senderType: 'user',
      senderName: user.fullName || user.email,
      message: ticketData.description,
      attachments: ticketData.attachments || [],
    });

    return ticket;
  }

  /**
   * Reply to ticket
   */
  async replyToTicket(userId, ticketId, message, attachments = []) {
    const ticket = await this.getTicketById(userId, ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestError('Cannot reply to closed ticket');
    }

    const user = await User.findByPk(userId);

    const ticketMessage = await TicketMessage.create({
      ticketId: ticket.id,
      senderId: userId,
      senderType: 'user',
      senderName: user.fullName || user.email,
      message,
      attachments,
    });

    // Update ticket
    await ticket.update({
      lastReplyBy: 'user',
      lastReplyAt: new Date(),
      status: ticket.status === 'resolved' ? 'open' : ticket.status,
    });

    return ticketMessage;
  }

  /**
   * Close ticket
   */
  async closeTicket(userId, ticketId) {
    const ticket = await this.getTicketById(userId, ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestError('Ticket is already closed');
    }

    await ticket.update({
      status: 'closed',
      closedAt: new Date(),
    });

    return ticket;
  }

  /**
   * Reopen ticket
   */
  async reopenTicket(userId, ticketId) {
    const ticket = await this.getTicketById(userId, ticketId);

    if (ticket.status !== 'closed') {
      throw new BadRequestError('Only closed tickets can be reopened');
    }

    await ticket.update({
      status: 'open',
      closedAt: null,
    });

    return ticket;
  }

  /**
   * Rate ticket
   */
  async rateTicket(userId, ticketId, rating, comment = null) {
    const ticket = await this.getTicketById(userId, ticketId);

    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      throw new BadRequestError('Can only rate resolved or closed tickets');
    }

    if (ticket.rating) {
      throw new BadRequestError('Ticket has already been rated');
    }

    await ticket.update({
      rating,
      ratingComment: comment,
    });

    return ticket;
  }

  /**
   * Get FAQ categories
   */
  async getFAQCategories() {
    return [
      { id: 'account', name: 'Account', icon: 'User', count: 12 },
      { id: 'trading', name: 'Trading', icon: 'TrendingUp', count: 18 },
      { id: 'deposits', name: 'Deposits', icon: 'Download', count: 8 },
      { id: 'withdrawals', name: 'Withdrawals', icon: 'Upload', count: 10 },
      { id: 'security', name: 'Security', icon: 'Shield', count: 15 },
      { id: 'verification', name: 'Verification', icon: 'CheckCircle', count: 6 },
    ];
  }

  /**
   * Search FAQ
   */
  async searchFAQ(query) {
    // Mock FAQ data - in production, this would come from database
    const faqs = [
      { id: 1, category: 'account', question: 'How do I create an account?', answer: 'Click Sign Up and follow the registration process.' },
      { id: 2, category: 'account', question: 'How do I reset my password?', answer: 'Click Forgot Password on the login page.' },
      { id: 3, category: 'trading', question: 'What are trading fees?', answer: 'Trading fees are 0.1% for spot and 0.04% for futures.' },
      { id: 4, category: 'deposits', question: 'How long do deposits take?', answer: 'Deposits are credited after required confirmations.' },
      { id: 5, category: 'withdrawals', question: 'What is the minimum withdrawal?', answer: 'Minimum withdrawal varies by currency.' },
      { id: 6, category: 'security', question: 'How do I enable 2FA?', answer: 'Go to Security Settings and click Enable 2FA.' },
    ];

    if (!query) return faqs;

    const lowerQuery = query.toLowerCase();
    return faqs.filter(faq => 
      faq.question.toLowerCase().includes(lowerQuery) ||
      faq.answer.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get ticket statistics for user
   */
  async getTicketStats(userId) {
    const [total, open, pending, resolved, closed] = await Promise.all([
      Ticket.count({ where: { userId } }),
      Ticket.count({ where: { userId, status: 'open' } }),
      Ticket.count({ where: { userId, status: 'pending' } }),
      Ticket.count({ where: { userId, status: 'resolved' } }),
      Ticket.count({ where: { userId, status: 'closed' } }),
    ]);

    return { total, open, pending, resolved, closed };
  }
}

module.exports = new SupportService();
