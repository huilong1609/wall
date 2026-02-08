const { Op } = require('sequelize');
const { sequelize } = require('../models'); 
const { TraderProfile, CopyRelation, User, Order, Trade } = require('../models');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class CopyTradingService {
  /**
   * Get all traders
   */
  async getTraders(filters = {}) {
    const { riskLevel, badge, minProfit, search, sortBy = 'profit30d', page = 1, limit = 20 } = filters;

    const where = { status: 'active', acceptingCopiers: true };
    if (riskLevel) where.riskLevel = riskLevel;
    if (badge) where.badge = badge;
    if (minProfit) where.profit30d = { [Op.gte]: minProfit };

    if (search) {
      where[Op.or] = [
        { displayName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const order = [];
    switch (sortBy) {
      case 'profit': order.push(['profitAll', 'DESC']); break;
      case 'profit30d': order.push(['profit30d', 'DESC']); break;
      case 'copiers': order.push(['totalCopiers', 'DESC']); break;
      case 'winRate': order.push(['winRate', 'DESC']); break;
      case 'drawdown': order.push(['maxDrawdown', 'ASC']); break;
      default: order.push(['profit30d', 'DESC']);
    }

    const { count, rows } = await TraderProfile.findAndCountAll({
      where,
      order,
      limit,
      offset: (page - 1) * limit,
    });
    const platformStats = await TraderProfile.findAll({
      where,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalTraders'],
          [sequelize.fn('SUM', sequelize.col('total_copiers')), 'totalCopiers'],
          [sequelize.fn('SUM', sequelize.col('profit_all')), 'totalProfit'],
          [sequelize.fn('AVG', sequelize.col('profit_30d')), 'avgReturn'],
        ],
        raw: true,
      });


    return {
      traders: rows,
      stats: platformStats[0] || [],
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  /**
   * Get trader profile
   */
  async getTraderProfile(traderId) {
    const profile = await TraderProfile.findOne({
      where: { id: traderId },
    });

    if (!profile) {
      throw new NotFoundError('Trader profile not found');
    }

    return profile;
  }

  /**
   * Get trader by user ID
   */
  async getTraderByUserId(userId) {
    const profile = await TraderProfile.findOne({
      where: { userId },
      include: [{ model: User, as: 'user', attributes: ['username', 'avatar'] }],
    });

    return profile;
  }

  /**
   * Follow a trader
   */
  async followTrader(userId, traderId) {
    const trader = await this.getTraderProfile(traderId);
    
    if (trader.userId === userId) {
      throw new BadRequestError('Cannot follow yourself');
    }

    // Check if already following
    const existing = await CopyRelation.findOne({
      where: { copierId: userId, traderProfileId: traderId, type: 'follow' },
    });

    if (existing) {
      throw new BadRequestError('Already following this trader');
    }

    const relation = await CopyRelation.create({
      copierId: userId,
      traderProfileId: traderId,
      type: 'follow',
      status: 'active',
    });

    // Update follower count
    await trader.update({ totalFollowers: trader.totalFollowers + 1 });

    return relation;
  }

  /**
   * Unfollow a trader
   */
  async unfollowTrader(userId, traderId) {
    const relation = await CopyRelation.findOne({
      where: { copierId: userId, traderProfileId: traderId, type: 'follow' },
    });

    if (!relation) {
      throw new NotFoundError('Not following this trader');
    }

    await relation.destroy();

    // Update follower count
    const trader = await this.getTraderProfile(traderId);
    await trader.update({ totalFollowers: Math.max(0, trader.totalFollowers - 1) });

    return { unfollowed: true };
  }

  /**
   * Start copying a trader
   */
  async startCopying(userId, traderId, settings) {
    const { copyAmount, copyMode, maxPerTrade, stopLossPercent, takeProfitPercent } = settings;

    const trader = await this.getTraderProfile(traderId);
    
    if (trader.userId === userId) {
      throw new BadRequestError('Cannot copy yourself');
    }

    if (!trader.acceptingCopiers) {
      throw new BadRequestError('Trader is not accepting copiers');
    }

    if (copyAmount < parseFloat(trader.minCopyAmount)) {
      throw new BadRequestError(`Minimum copy amount is ${trader.minCopyAmount}`);
    }

    // Check if already copying
    const existing = await CopyRelation.findOne({
      where: { copierId: userId, traderProfileId: trader.id, type: 'copy', status: { [Op.ne]: 'stopped' } },
    });

    if (existing) {
      throw new BadRequestError('Already copying this trader');
    }

    const relation = await CopyRelation.create({
      copierId: userId,
      traderProfileId: trader.id,
      type: 'copy',
      status: 'active',
      copyAmount,
      copyMode: copyMode || 'proportional',
      maxPerTrade,
      stopLossPercent,
      takeProfitPercent,
      invested: copyAmount,
      currentValue: copyAmount,
    });
  
    // Update copier count
    await trader.update({ totalCopiers: trader.totalCopiers + 1 });

    return relation;
  }

  /**
   * Stop copying a trader
   */
  async stopCopying(userId, relationId) {
    const relation = await CopyRelation.findOne({
      where: { id: relationId, copierId: userId, type: 'copy' },
      include: [{ model: TraderProfile, as: 'traderProfile' }],
    });

    if (!relation) {
      throw new NotFoundError('Copy relation not found');
    }

    await relation.update({
      status: 'stopped',
      stoppedAt: new Date(),
    });

    // Update copier count
    await relation.traderProfile.update({
      totalCopiers: Math.max(0, relation.traderProfile.totalCopiers - 1),
    });

    return relation;
  }

  async myTraders(userId){
     const relation = await CopyRelation.findAll({
      where: {  copierId: userId },
      include: [{ model: TraderProfile, as: 'traderProfile' }],
    });
    const stats = {
      totalTrades: 0 ,
      totalWins: 0,
      activeTrades: [relation].filter(t => t.status === 'active').length,
      WinRate: 0.00 
    }
    return {
      relation,
      stats
    }
  }

  /**
   * Update copy settings
   */
  async updateCopySettings(userId, relationId, settings) {
    const relation = await CopyRelation.findOne({
      where: { id: relationId, copierId: userId, type: 'copy' },
    });

    if (!relation) {
      throw new NotFoundError('Copy relation not found');
    }

    const allowedUpdates = ['copyAmount', 'copyMode', 'maxPerTrade', 'stopLossPercent', 'takeProfitPercent', 'notifications'];
    const filteredUpdates = {};

    Object.keys(settings).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = settings[key];
      }
    });

    await relation.update(filteredUpdates);

    return relation;
  }

  /**
   * Pause/Resume copying
   */
  async toggleCopyStatus(userId, relationId) {
    const relation = await CopyRelation.findOne({
      where: { id: relationId, copierId: userId, type: 'copy' },
    });

    if (!relation) {
      throw new NotFoundError('Copy relation not found');
    }

    if (relation.status === 'stopped') {
      throw new BadRequestError('Cannot resume stopped copy relation');
    }

    const newStatus = relation.status === 'active' ? 'paused' : 'active';
    await relation.update({
      status: newStatus,
      pausedAt: newStatus === 'paused' ? new Date() : null,
    });

    return relation;
  }

  /**
   * Get user's copy trading portfolio
   */
  async getCopyPortfolio(userId) {
    const copying = await CopyRelation.findAll({
      where: { copierId: userId, type: 'copy', status: { [Op.ne]: 'stopped' } },
      include: [{
        model: TraderProfile,
        as: 'traderProfile',
        include: [{ model: User, as: 'user', attributes: ['username', 'avatar'] }],
      }],
    });

    const following = await CopyRelation.findAll({
      where: { copierId: userId, type: 'follow' },
      include: [{
        model: TraderProfile,
        as: 'traderProfile',
        include: [{ model: User, as: 'user', attributes: ['username', 'avatar'] }],
      }],
    });

    const totalInvested = copying.reduce((sum, r) => sum + parseFloat(r.invested), 0);
    const totalValue = copying.reduce((sum, r) => sum + parseFloat(r.currentValue), 0);
    const totalProfit = totalValue - totalInvested;

    return {
      copying,
      following,
      summary: {
        totalInvested,
        totalValue,
        totalProfit,
        profitPercent: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
        activeCopies: copying.filter(r => r.status === 'active').length,
        totalFollowing: following.length,
      },
    };
  }

  /**
   * Become a trader
   */
  async becomeTrader(userId, profileData) {
    const existing = await TraderProfile.findOne({ where: { userId } });
    if (existing) {
      throw new BadRequestError('Already registered as a trader');
    }

    const profile = await TraderProfile.create({
      userId,
      displayName: profileData.displayName,
      bio: profileData.bio,
      tradingStyle: profileData.tradingStyle,
      markets: profileData.markets || [],
      riskLevel: profileData.riskLevel || 'medium',
      minCopyAmount: profileData.minCopyAmount || 100,
      performanceFee: profileData.performanceFee || 0.2,
    });

    return profile;
  }

  /**
   * Update trader profile
   */
  async updateTraderProfile(userId, updates) {
    const profile = await TraderProfile.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundError('Trader profile not found');
    }

    const allowedUpdates = ['displayName', 'bio', 'tradingStyle', 'markets', 'riskLevel', 'minCopyAmount', 'performanceFee', 'acceptingCopiers'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    await profile.update(filteredUpdates);

    return profile;
  }
}

module.exports = new CopyTradingService();
