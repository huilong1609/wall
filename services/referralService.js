const { Op } = require('sequelize');
const { Referral, ReferralEarning, User } = require('../models');
const { NotFoundError } = require('../utils/errors');
const config = require('../config');

class ReferralService {
  /**
   * Get referral info for user
   */
  async getReferralInfo(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const referralCount = await Referral.count({ where: { referrerId: userId } });
  const activeReferrals = await Referral.count({ where: { referrerId: userId, status: 'active' } });

  // Get tier info
  const tier = this.calculateTier(referralCount);

  // Build referral link
  const referralLink = `${config.frontendUrl}/ref/${user.referralCode}`;

  return {
    referralCode: user.referralCode,
    referralLink,
    tier: tier.name,
    commissionRate: tier.commission,
    totalReferrals: referralCount,
    activeReferrals,
    totalEarnings: parseFloat(user.referralEarnings) || 0,
    nextTier: this.getNextTier(referralCount),
    shareLink: [
      {
        name: 'Twitter',
        icon: 'Twitter',
        color: '#1DA1F2',
        url: `https://twitter.com/intent/tweet?text=Join me on this amazing trading platform!&url=${referralLink}`
      },
      {
        name: 'Facebook',
        icon: 'Facebook',
        color: '#4267B2',
        url: `https://www.facebook.com/sharer/sharer.php?u=${referralLink}`
      },
      {
        name: 'Telegram',
        icon: 'MessageCircle',
        color: '#0088cc',
        url: `https://t.me/share/url?url=${referralLink}&text=Join me on this amazing trading platform!`
      },
      {
        name: 'Email',
        icon: 'Mail',
        color: '#EA4335',
        url: `mailto:?subject=Join this trading platform&body=Use my referral link: ${referralLink}`
      }
    ]
  };
}


/**
 * Calculate tier based on referral count
 */
calculateTier(referralCount) {
  const tiers = config.referral.tiers;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (referralCount >= tiers[i].minReferrals) {
      return tiers[i];
    }
  }
  return tiers[0];
}

/**
 * Get next tier info
 */
getNextTier(referralCount) {
  const tiers = config.referral.tiers;
  for (const tier of tiers) {
    if (referralCount < tier.minReferrals) {
      return {
        name: tier.name,
        requiredReferrals: tier.minReferrals,
        remaining: tier.minReferrals - referralCount,
      };
    }
  }
  return null;
}

  /**
   * Get referrals for user
   */
  async getReferrals(userId, filters = {}) {
  const { status, page = 1, limit = 20 } = filters;

  const where = { referrerId: userId };
  if (status) where.status = status;

  const { count, rows } = await Referral.findAndCountAll({
    where,
    include: [{
      model: User,
      as: 'referred',
      attributes: ['id', 'email', 'username', 'createdAt'],
    }],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    referrals: rows,
    pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  };
}

  /**
   * Get referral earnings
   */
  async getEarnings(userId, filters = {}) {
  const { type, startDate, endDate, page = 1, limit = 20 } = filters;

  const where = { referrerId: userId };
  if (type) where.type = type;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }

  const { count, rows } = await ReferralEarning.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    earnings: rows,
    pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  };
}

  /**
   * Get earnings summary
   */
  async getEarningsSummary(userId, period = '30d') {
  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const earnings = await ReferralEarning.findAll({
    where: {
      referrerId: userId,
      createdAt: { [Op.gte]: startDate },
      status: 'credited',
    },
  });

  const summary = {
    totalEarnings: 0,
    tradingFeeEarnings: 0,
    bonusEarnings: 0,
    byDay: {},
  };

  earnings.forEach(earning => {
    const amount = parseFloat(earning.amount);
    summary.totalEarnings += amount;

    if (earning.type === 'trading_fee') {
      summary.tradingFeeEarnings += amount;
    } else {
      summary.bonusEarnings += amount;
    }

    const day = earning.createdAt.toISOString().split('T')[0];
    if (!summary.byDay[day]) {
      summary.byDay[day] = 0;
    }
    summary.byDay[day] += amount;
  });

  return summary;
}

  /**
   * Process referral commission (called when trade is made)
   */
  async processCommission(userId, tradeId, tradingVolume, feeAmount) {
  const referral = await Referral.findOne({
    where: { referredId: userId, status: 'active' },
    include: [{ model: User, as: 'referrer' }],
  });

  if (!referral) return null;

  const tier = this.calculateTier(await Referral.count({ where: { referrerId: referral.referrerId } }));
  const commission = feeAmount * tier.commission;

  // Create earning record
  const earning = await ReferralEarning.create({
    referralId: referral.id,
    referrerId: referral.referrerId,
    referredId: userId,
    type: 'trading_fee',
    currency: 'USDT',
    amount: commission,
    tradingVolume,
    commissionRate: tier.commission,
    tradeId,
    status: 'credited',
    creditedAt: new Date(),
  });

  // Update referral stats
  await referral.update({
    totalEarnings: parseFloat(referral.totalEarnings) + commission,
    totalTradingVolume: parseFloat(referral.totalTradingVolume) + tradingVolume,
    lastEarningAt: new Date(),
  });

  // Update referrer's total earnings
  await referral.referrer.update({
    referralEarnings: parseFloat(referral.referrer.referralEarnings) + commission,
  });

  return earning;
}

  /**
   * Get leaderboard
   */
  async getLeaderboard(period = '30d', limit = 10) {
  const days = { '7d': 7, '30d': 30, '90d': 90, 'all': 3650 }[period] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const earnings = await ReferralEarning.findAll({
    where: {
      createdAt: { [Op.gte]: startDate },
      status: 'credited',
    },
    attributes: [
      'referrerId',
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalEarnings'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'referralCount'],
    ],
    group: ['referrerId'],
    order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
    limit,
    include: [{
      model: User,
      as: 'referrer',
      attributes: ['username', 'avatar'],
    }],
  });

  return earnings;
}
}

module.exports = new ReferralService();
