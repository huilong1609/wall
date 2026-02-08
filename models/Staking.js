const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Staking Pool model
  const StakingPool = sequelize.define('StakingPool', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    asset: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('flexible', 'locked'),
      allowNull: false,
    },
    apy: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    minStake: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'min_stake',
    },
    maxStake: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'max_stake',
    },
    lockPeriodDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'lock_period_days',
    },
    totalStaked: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'total_staked',
    },
    totalCapacity: {
      type: DataTypes.DECIMAL(30, 18),
      field: 'total_capacity',
    },
    participants: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    rewardDistribution: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'end'),
      defaultValue: 'daily',
      field: 'reward_distribution',
    },
    autoCompound: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'auto_compound',
    },
    earlyUnstakePenalty: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      field: 'early_unstake_penalty',
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'ended'),
      defaultValue: 'active',
    },
    startDate: {
      type: DataTypes.DATE,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATE,
      field: 'end_date',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'staking_pools',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['asset'] },
      { fields: ['type'] },
      { fields: ['status'] },
    ],
  });

  // User Staking Position
  const StakingPosition = sequelize.define('StakingPosition', {
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
    poolId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'pool_id',
      references: {
        model: 'staking_pools',
        key: 'id',
      },
    },
    asset: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(30, 18),
      allowNull: false,
    },
    lockedAmount: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'locked_amount',
    },
    rewardsEarned: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'rewards_earned',
    },
    rewardsClaimed: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'rewards_claimed',
    },
    rewardsPending: {
      type: DataTypes.DECIMAL(30, 18),
      defaultValue: 0,
      field: 'rewards_pending',
    },
    apy: {
      type: DataTypes.DECIMAL(10, 4),
    },
    autoCompound: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'auto_compound',
    },
    status: {
      type: DataTypes.ENUM('active', 'unstaking', 'completed', 'cancelled'),
      defaultValue: 'active',
    },
    stakedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'staked_at',
    },
    lockEndsAt: {
      type: DataTypes.DATE,
      field: 'lock_ends_at',
    },
    unstakedAt: {
      type: DataTypes.DATE,
      field: 'unstaked_at',
    },
    lastRewardAt: {
      type: DataTypes.DATE,
      field: 'last_reward_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'staking_positions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['pool_id'] },
      { fields: ['status'] },
      { fields: ['asset'] },
    ],
  });

  return { StakingPool, StakingPosition };
};
