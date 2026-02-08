const { Op } = require('sequelize');
const { sequelize, StakingPool, StakingPosition, Wallet, Transaction } = require('../models');
const { generateTransactionId } = require('../utils/helpers');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class StakingService {
  /**
   * Get all staking pools
   */
  async getPools(filters = {}) {
    const { asset, type, status = 'active' } = filters;

    const where = {};
    if (asset) where.asset = asset.toUpperCase();
    if (type) where.type = type;
    if (status) where.status = status;

    const pools = await StakingPool.findAll({
      where,
      order: [['apy', 'DESC']],
    });

    return pools;
  }

  /**
   * Get pool by ID
   */
  async getPoolById(poolId) {
    const pool = await StakingPool.findByPk(poolId);
    if (!pool) {
      throw new NotFoundError('Staking pool not found');
    }
    return pool;
  }

  /**
   * Get user positions
   */
  async getUserPositions(userId, filters = {}) {
    const { status, asset } = filters;

    const where = { userId };
    if (status) where.status = status;
    if (asset) where.asset = asset.toUpperCase();

    const positions = await StakingPosition.findAll({
      where,
      include: [{ model: StakingPool, as: 'pool' }],
      order: [['createdAt', 'DESC']],
    });

    return positions;
  }

  /**
   * Stake tokens
   */
  async stake(userId, poolId, amount) {
    const pool = await this.getPoolById(poolId);

    if (pool.status !== 'active') {
      throw new BadRequestError('Staking pool is not active');
    }

    if (amount < parseFloat(pool.minStake)) {
      throw new BadRequestError(`Minimum stake is ${pool.minStake} ${pool.asset}`);
    }

    if (pool.maxStake && amount > parseFloat(pool.maxStake)) {
      throw new BadRequestError(`Maximum stake is ${pool.maxStake} ${pool.asset}`);
    }

    // Check capacity
    if (pool.totalCapacity) {
      const remaining = parseFloat(pool.totalCapacity) - parseFloat(pool.totalStaked);
      if (amount > remaining) {
        throw new BadRequestError(`Only ${remaining} ${pool.asset} capacity remaining`);
      }
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({
      where: { userId, type: 'spot', currency: pool.asset },
    });

    if (!wallet || parseFloat(wallet.available) < amount) {
      throw new BadRequestError('Insufficient balance');
    }

    const t = await sequelize.transaction();

    try {
      // Deduct from wallet
      await wallet.update({
        available: parseFloat(wallet.available) - amount,
        staked: parseFloat(wallet.staked) + amount,
      }, { transaction: t });

      // Calculate lock end date
      let lockEndsAt = null;
      if (pool.type === 'locked' && pool.lockPeriodDays > 0) {
        lockEndsAt = new Date();
        lockEndsAt.setDate(lockEndsAt.getDate() + pool.lockPeriodDays);
      }

      // Create position
      const position = await StakingPosition.create({
        userId,
        poolId,
        asset: pool.asset,
        amount,
        lockedAmount: pool.type === 'locked' ? amount : 0,
        apy: pool.apy,
        autoCompound: pool.autoCompound,
        lockEndsAt,
        stakedAt: new Date(),
      }, { transaction: t });

      // Update pool stats
      await pool.update({
        totalStaked: parseFloat(pool.totalStaked) + amount,
        participants: pool.participants + 1,
      }, { transaction: t });

      // Create transaction
      await Transaction.create({
        transactionId: generateTransactionId('STK'),
        userId,
        walletId: wallet.id,
        type: 'staking_reward',
        currency: pool.asset,
        amount,
        status: 'completed',
        description: `Staked in ${pool.name}`,
        completedAt: new Date(),
      }, { transaction: t });

      await t.commit();

      return position;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Unstake tokens
   */
  async unstake(userId, positionId, amount = null) {
    const position = await StakingPosition.findOne({
      where: { id: positionId, userId },
      include: [{ model: StakingPool, as: 'pool' }],
    });

    if (!position) {
      throw new NotFoundError('Staking position not found');
    }

    if (position.status !== 'active') {
      throw new BadRequestError('Position is not active');
    }

    const unstakeAmount = amount || parseFloat(position.amount);

    // Check lock period
    let penalty = 0;
    if (position.lockEndsAt && position.lockEndsAt > new Date()) {
      penalty = unstakeAmount * parseFloat(position.pool.earlyUnstakePenalty);
    }

    const wallet = await Wallet.findOne({
      where: { userId, type: 'spot', currency: position.asset },
    });

    const t = await sequelize.transaction();

    try {
      const netAmount = unstakeAmount - penalty;

      // Return to wallet
      await wallet.update({
        available: parseFloat(wallet.available) + netAmount,
        staked: parseFloat(wallet.staked) - unstakeAmount,
      }, { transaction: t });

      // Update position
      const newAmount = parseFloat(position.amount) - unstakeAmount;
      if (newAmount <= 0) {
        await position.update({
          amount: 0,
          status: 'completed',
          unstakedAt: new Date(),
        }, { transaction: t });
      } else {
        await position.update({ amount: newAmount }, { transaction: t });
      }

      // Update pool stats
      await position.pool.update({
        totalStaked: parseFloat(position.pool.totalStaked) - unstakeAmount,
      }, { transaction: t });

      await t.commit();

      return { unstaked: unstakeAmount, penalty, received: netAmount };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Claim rewards
   */
  async claimRewards(userId, positionId) {
    const position = await StakingPosition.findOne({
      where: { id: positionId, userId },
    });

    if (!position) {
      throw new NotFoundError('Staking position not found');
    }

    const pendingRewards = parseFloat(position.rewardsPending);
    if (pendingRewards <= 0) {
      throw new BadRequestError('No rewards to claim');
    }

    const wallet = await Wallet.findOne({
      where: { userId, type: 'spot', currency: position.asset },
    });

    const t = await sequelize.transaction();

    try {
      // Add rewards to wallet
      await wallet.update({
        available: parseFloat(wallet.available) + pendingRewards,
      }, { transaction: t });

      // Update position
      await position.update({
        rewardsClaimed: parseFloat(position.rewardsClaimed) + pendingRewards,
        rewardsPending: 0,
      }, { transaction: t });

      // Create transaction
      await Transaction.create({
        transactionId: generateTransactionId('RWD'),
        userId,
        walletId: wallet.id,
        type: 'staking_reward',
        currency: position.asset,
        amount: pendingRewards,
        status: 'completed',
        description: 'Staking rewards claimed',
        completedAt: new Date(),
      }, { transaction: t });

      await t.commit();

      return { claimed: pendingRewards };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get staking statistics for user
   */
  async getUserStats(userId) {
    const positions = await StakingPosition.findAll({
      where: { userId, status: 'active' },
    });

    return {
      totalStaked: positions.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      totalRewardsEarned: positions.reduce((sum, p) => sum + parseFloat(p.rewardsEarned), 0),
      totalRewardsPending: positions.reduce((sum, p) => sum + parseFloat(p.rewardsPending), 0),
      activePositions: positions.length,
    };
  }
}

module.exports = new StakingService();
