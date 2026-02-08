const { Op } = require('sequelize');
const { sequelize, Wallet, Transaction, User, Coin, CoinNetwork, Network, WalletAddress } = require('../models');
const { generateTransactionId, generateRandomString, safeNumber } = require('../utils/helpers');
const { BadRequestError, NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

function mapTx(t) {
  const meta = t.metadata || {};
  const type = t.type; // 'deposit' | 'withdraw' | 'transfer'
  const asset = (meta.asset || t.currency || t.asset || "").toString().toUpperCase();
  const network = meta.network || t.network || null;

  // optional fields depending on your schema
  const amount = safeNumber(t.amount);
  const usdValue =
    safeNumber(meta.usdValue ?? meta.usd_value ?? t.usdValue ?? t.usd_value); // ok if you store it
  const status = t.status;
  const date = t.createdAt ?? t.created_at; // keep as Date

  return {
    id: t.id,
    type,
    asset: asset || null,
    network: network || null,
    amount,
    usdValue: usdValue || null,
    status,
    date,
    txHash: t.txHash ?? t.tx_hash ?? meta.txHash ?? null,
    address: t.address ?? meta.address ?? null,
    confirmations: meta.confirmations ?? null,
    failReason: meta.failReason ?? meta.fail_reason ?? null,
    from: meta.from ?? null,
    to: meta.to ?? null,
  };
}

function buildStats(mappedTxs) {
  const deposits = mappedTxs.filter((x) => x.type === "deposit");
  const withdrawals = mappedTxs.filter((x) => x.type === "withdraw");
  const transfers = mappedTxs.filter((x) => x.type === "transfer");

  const sum = (arr) => arr.reduce((s, x) => s + safeNumber(x.usdValue ?? 0), 0);

  return {
    totalDeposits: sum(deposits),
    totalWithdrawals: sum(withdrawals),
    totalTransfers: sum(transfers),
    depositCount: deposits.length,
    withdrawCount: withdrawals.length,
    transferCount: transfers.length,
  };
}

class WalletService {
  /**
   * Get all wallets for a user
   */
  async getWallets(userId) {
    return Wallet.findAll({
      where: { userId },
      include: [{ model: Coin, as: 'coin' }],
    });
  }

  /**
   * Get wallet overview with totals
   */
  async getOverview(userId, limit = 5) {
    const [wallets, recentTransactions] = await Promise.all([
      this.getWallets(userId),
      Transaction.findAll({
        where: { userId, source: 'wallet' },
        order: [['createdAt', 'DESC']],
        limit,
      }),
    ]);

    const mappedWallets = wallets.map((w) => {
      const balance = safeNumber(w.balance);
      const locked = safeNumber(w.lockedBalance ?? w.locked_balance); // handle either field style
      const available = balance - locked;

      // Adjust these to match your pricing source:
      // If you store pricing in w.rate, prefer that.
      const price = safeNumber(w.rate?.price ?? w.coin?.rate?.price ?? 1);
      const previousPrice = safeNumber(w.rate?.previous ?? w.coin?.rate?.previous ?? price);

      const amount = balance * price;
      const previousAmount = balance * previousPrice;

      return {
        id: w.id,
        symbol: w.coin?.symbol,
        name: w.coin?.name,
        balance,
        price,
        previousPrice,
        amount,
        previousAmount,
        change: w.rate?.change24h ?? w.coin?.rate?.change24h ?? 0,
        locked,
        available,
        icon: w.coin?.logo,
      };
    });

    const totalBalance = mappedWallets.reduce((sum, x) => sum + safeNumber(x.amount), 0);
    const previousBalance = mappedWallets.reduce((sum, x) => sum + safeNumber(x.previousAmount), 0);

    const stats = {
      totalBalance,
      previousBalance,
      pctChange: previousBalance > 0 ? (totalBalance - previousBalance) / previousBalance : 0,
    };

    return { stats, assets: mappedWallets, recentTransactions };
  }



  async getDeposit(userId, limit = 20) {
    const [wallets, networks, transactions] = await Promise.all([
      Wallet.findAll({
        where: { userId },
        include: [
          {
            model: Coin,
            as: "coin",
            include: [{ model: CoinNetwork, as: "coinNetwork" }],
          },
        ],
      }),
      Network.findAll(),
      Transaction.findAll({
        where: { userId, source: "wallet", type: "deposit" },
        order: [["createdAt", "DESC"]],
        limit,
      }),
    ]);

    // Assets list (unique coins)
    const assetsMap = new Map();
    for (const w of wallets) {
      const coinId = w.coin_id ?? w.coinId ?? w.coin?.id;
      if (!coinId) continue;

      if (!assetsMap.has(coinId)) {
        assetsMap.set(coinId, {
          id: coinId,
          name: w.coin?.name ?? null,
          symbol: w.coin?.symbol ?? null,
          networks: (w.coin?.coinNetwork ?? []).map((cn) => ({
            id: cn.id,
            networkId: cn.network_id ?? cn.networkId ?? null,
            network: cn.network ?? cn.name ?? null,
            address: w.address ?? w.wallet_address ?? null, // adjust to your column
            memo: w.memo ?? null,
            minDeposit: cn.min_deposit ?? cn.minDeposit ?? null,
            confirmations: cn.confirmations ?? null,
            fee: cn.fee ?? cn.network_fee ?? null,
          })),
        });
      }
    }
    const assets = [...assetsMap.values()];

    // Network details (global)
    const networkDetails = networks.map((n) => ({
      id: n.id,
      name: n.name,
      network: n.network,
      confirmations: n.confirmations,
      minDeposit: n.minDeposits ?? n.min_deposit ?? null,
      estimatedTime: n.time ?? "30-60 min",
    }));

    const recentDeposits = transactions.map((t) => ({
      asset: t.metadata?.asset ?? null,
      network: t.metadata?.network ?? null,
      amount: safeNumber(t.amount),
      status: t.status,
      time: t.createdAt ?? t.created_at,
      txHash: t.txHash ?? t.tx_hash ?? null,
    }));

    return { assets, networkDetails, recentDeposits };
  }

  async getWithdrawal(userId, limit = 20) {
    const [wallets, networks, transactions] = await Promise.all([
      Wallet.findAll({
        where: { userId },
        include: [
          {
            model: Coin,
            as: "coin",
            include: [{ model: CoinNetwork, as: "coinNetwork" }],
          },
        ],
      }),
      Network.findAll(),
      Transaction.findAll({
        where: { userId, source: "wallet", type: "withdrawal" },
        order: [["createdAt", "DESC"]],
        limit,
      }),
    ]);

    const assets = wallets.map((w) => {
      const balance = safeNumber(w.balance);
      const locked = safeNumber(w.lockedBalance ?? w.locked_balance);
      const available = balance - locked;

      const price = safeNumber(w.rate?.price ?? w.coin?.rate?.price ?? 1);

      return {
        id: w.coin_id ?? w.coinId ?? w.coin?.id,
        name: w.coin?.name ?? null,
        symbol: w.coin?.symbol ?? null,
        balance,
        available,
        locked,
        price,
        fiatValue: balance * price,
        networks: (w.coin?.coinNetwork ?? []).map((cn) => ({
          id: cn.id,
          networkId: cn.network_id ?? cn.networkId ?? null,
          network: cn.network ?? cn.name ?? null,
          fee: cn.fee ?? cn.network_fee ?? null,
          minWithdrawal: cn.min_withdrawal ?? cn.minWithdrawal ?? null,
          address: w.address ?? w.wallet_address ?? null, // withdraw-from address if you store one
        })),
      };
    });

    const networkDetails = networks.map((n) => ({
      id: n.id,
      name: n.name,
      network: n.network,
      fee: n.networkFees ?? n.network_fees ?? null,
      minWithdrawal: n.minWithdrawal ?? n.min_withdrawal ?? null,
    }));

    const withdrawalLimits = {
      daily: 100000,
      remaining: 85000,
      minWithdraw: 0.001,
    };

    const recentWithdrawals = transactions.map((t) => ({
      asset: t.metadata?.asset ?? null,
      network: t.metadata?.network ?? null,
      amount: safeNumber(t.amount),
      status: t.status,
      time: t.createdAt ?? t.created_at,
      address: t.address ?? null,
      txHash: t.txHash ?? t.tx_hash ?? null,
    }));

    return { assets, networkDetails, withdrawalLimits, recentWithdrawals };
  }



  /**
   * Get wallets by type
   */
  async getWalletsByType(userId, type) {
    const wallets = await Wallet.findAll({
      where: { userId, type },
      order: [['currency', 'ASC']],
    });
    return wallets;
  }

  /**
   * Get balance for specific currency
   */
  async getBalance(userId, type, currency) {
    const wallet = await Wallet.findOne({
      where: { userId, type, currency: currency.toUpperCase() },
    });

    if (!wallet) {
      return { available: 0, locked: 0, pending: 0, staked: 0, total: 0 };
    }

    return {
      available: parseFloat(wallet.available),
      locked: parseFloat(wallet.locked),
      pending: parseFloat(wallet.pending),
      staked: parseFloat(wallet.staked),
      total: wallet.getTotal(),
    };
  }

  /**
   * Get or create deposit address
   */
  async getDepositAddress(userId, data={}) {
    const {symbol , network} = data;
    const coin = await Coin.findOne({where: {symbol}})
    if(!coin){
      throw new ValidationError('Invalid Coin')
    }
    const walletAddress = await WalletAddress.findOne({
      where: {
        userId,
        coinId: coin.id,
        networkId: network
      }
    })
    return {
      address: walletAddress?.address ? walletAddress?.address : 'none',
    };
  }

  /**
   * Get deposit history
   */
  async getDepositHistory(userId, filters = {}) {
    const { currency, status, page = 1, limit = 20 } = filters;

    const where = { userId, type: 'deposit' };
    if (currency) where.currency = currency.toUpperCase();
    if (status) where.status = status;

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      deposits: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(userId, withdrawalData) {
    const { currency, amount, address, network, memo } = withdrawalData;
    const currencyUpper = currency.toUpperCase();

    // Get wallet
    const wallet = await Wallet.findOne({
      where: { userId, type: 'spot', currency: currencyUpper },
    });

    if (!wallet) {
      throw new BadRequestError(`No ${currencyUpper} wallet found`);
    }

    if (parseFloat(wallet.available) < amount) {
      throw new BadRequestError('Insufficient balance');
    }

    // Get user for verification check
    const user = await User.findByPk(userId);
    if (!user || user.kycStatus === 'none') {
      throw new ForbiddenError('KYC verification required for withdrawals');
    }

    const t = await sequelize.transaction();

    try {
      // Lock the amount
      await wallet.lockBalance(amount);

      // Create transaction
      const transaction = await Transaction.create({
        transactionId: generateTransactionId('WTH'),
        userId,
        walletId: wallet.id,
        type: 'withdrawal',
        currency: currencyUpper,
        amount,
        fee: amount * 0.001, // 0.1% fee
        status: 'pending',
        network,
        address,
        description: `Withdrawal to ${address}`,
      }, { transaction: t });

      await t.commit();

      logger.info(`Withdrawal requested: ${transaction.transactionId} by user ${userId}`);

      return transaction;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(userId, filters = {}) {
    const { currency, status, page = 1, limit = 20 } = filters;

    const where = { userId, type: 'withdrawal' };
    if (currency) where.currency = currency.toUpperCase();
    if (status) where.status = status;

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      withdrawals: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Cancel pending withdrawal
   */
  async cancelWithdrawal(userId, transactionId) {
    const transaction = await Transaction.findOne({
      where: { id: transactionId, userId, type: 'withdrawal' },
    });

    if (!transaction) {
      throw new NotFoundError('Withdrawal not found');
    }

    if (transaction.status !== 'pending') {
      throw new BadRequestError('Only pending withdrawals can be cancelled');
    }

    const t = await sequelize.transaction();

    try {
      // Unlock the amount
      const wallet = await Wallet.findByPk(transaction.walletId);
      if (wallet) {
        await wallet.unlockBalance(parseFloat(transaction.amount));
      }

      // Update transaction
      await transaction.cancel('Cancelled by user');

      await t.commit();

      return transaction;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Transfer between wallets
   */
  async transfer(userId, from, to, currency, amount) {
    currency = currency.toUpperCase();

    if (from === to) {
      throw new BadRequestError('Source and destination wallets must be different');
    }

    const fromWallet = await Wallet.findOne({
      where: { userId, type: from, currency },
    });

    if (!fromWallet || parseFloat(fromWallet.available) < amount) {
      throw new BadRequestError('Insufficient balance');
    }

    let toWallet = await Wallet.findOne({
      where: { userId, type: to, currency },
    });

    const t = await sequelize.transaction();

    try {
      // Create destination wallet if needed
      if (!toWallet) {
        toWallet = await Wallet.create({
          userId,
          type: to,
          currency,
        }, { transaction: t });
      }

      // Update balances
      await fromWallet.update({
        available: parseFloat(fromWallet.available) - amount,
      }, { transaction: t });

      await toWallet.update({
        available: parseFloat(toWallet.available) + amount,
      }, { transaction: t });

      // Create transactions
      await Transaction.create({
        transactionId: generateTransactionId('TRF'),
        userId,
        walletId: fromWallet.id,
        type: 'transfer_out',
        currency,
        amount,
        status: 'completed',
        toWalletId: toWallet.id,
        description: `Transfer to ${to} wallet`,
        completedAt: new Date(),
      }, { transaction: t });

      await Transaction.create({
        transactionId: generateTransactionId('TRF'),
        userId,
        walletId: toWallet.id,
        type: 'transfer_in',
        currency,
        amount,
        status: 'completed',
        fromWalletId: fromWallet.id,
        description: `Transfer from ${from} wallet`,
        completedAt: new Date(),
      }, { transaction: t });

      await t.commit();

      return { from: fromWallet, to: toWallet };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get transfer history
   */
  async getTransferHistory(userId, page = 1, limit = 20) {
    const { count, rows } = await Transaction.findAndCountAll({
      where: {
        userId,
        type: { [Op.in]: ['transfer_in', 'transfer_out'] },
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      transfers: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get all transactions
   */


async  getTransactions(userId, filters = {}) {
  const {
    type = "all",
    currency,
    status = "all",
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  const where = { userId, source: "wallet" };

  if (type && type !== "all") where.type = type; // deposit/withdraw/transfer
  if (status && status !== "all") where.status = status;

  // If you store currency column use it; otherwise rely on metadata.asset
  if (currency) {
    where.currency = currency.toUpperCase();
    // If you DON'T have currency column, remove line above and filter on metadata in JS,
    // or use a JSONB query with Sequelize.literal(...) (tell me your exact column).
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }

  // main paged query
  const { count, rows } = await Transaction.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  const transactions = rows.map(mapTx);

  // stats should normally be based on ALL matching rows (not just current page)
  // easiest: run a light second query without pagination for stats only
  const allForStats = await Transaction.findAll({
    where,
    attributes: ["id", "type", "amount", "status", "createdAt", "currency", "metadata", "txHash", "address"],
    order: [["createdAt", "DESC"]],
  });
  const stats = buildStats(allForStats.map(mapTx));

  const transactionTypes = [
    { id: "all", label: "All Types" },
    { id: "deposit", label: "Deposits" },
    { id: "withdraw", label: "Withdrawals" },
    { id: "transfer", label: "Transfers" },
  ];

  const statusTypes = [
    { id: "all", label: "All Status" },
    { id: "completed", label: "Completed" },
    { id: "pending", label: "Pending" },
    { id: "failed", label: "Failed" },
  ];

  const dateRanges = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "7days", label: "Last 7 Days" },
    { id: "30days", label: "Last 30 Days" },
    { id: "90days", label: "Last 90 Days" },
  ];

  return {
    stats,
    transactions, // mapped to your UI format
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
    transactionTypes,
    statusTypes,
    dateRanges,
  };
}



  /**
   * Get transaction by ID
   */
  async getTransactionById(userId, transactionId) {
    const transaction = await Transaction.findOne({
      where: { id: transactionId, userId },
      include: [{ model: Wallet, as: 'wallet' }],
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }
}

module.exports = new WalletService();
