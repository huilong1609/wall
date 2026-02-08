const { Signal, SignalProvider, SignalSubscription, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { Op } = require('sequelize');

// Get all signal providers
exports.getSignalProviders = async (req, res) => {
  try {
    const { 
      search, 
      sortBy = 'popular', 
      tier,
      minRating,
      minWinRate,
      page = 1,
      limit = 20,
      verified
    } = req.query;

    const where = { status: 'active', isPublic: true };

    if (tier) {
      where.tier = tier;
    }

    if (verified === 'true') {
      where.verified = true;
    }

    if (minRating) {
      where.rating = { [Op.gte]: parseFloat(minRating) };
    }

    if (minWinRate) {
      where.winRate = { [Op.gte]: parseFloat(minWinRate) };
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { tradingStyle: { [Op.like]: `%${search}%` } },
      ];
    }

    let order = [];
    switch (sortBy) {
      case 'popular':
        order = [['subscribers', 'DESC']];
        break;
      case 'rating':
        order = [['rating', 'DESC']];
        break;
      case 'winRate':
        order = [['winRate', 'DESC']];
        break;
      case 'profit':
        order = [['totalProfit', 'DESC']];
        break;
      case 'newest':
        order = [['createdAt', 'DESC']];
        break;
      default:
        order = [['subscribers', 'DESC']];
    }

    const offset = (page - 1) * limit;

    const { count, rows: providers } = await SignalProvider.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset,
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'avatar'],
      }],
    });

    // Check if user is subscribed to each provider
    let userSubscriptions = [];
    if (req.user) {
      userSubscriptions = await SignalSubscription.findAll({
        where: {
          userId: req.user.id,
          status: 'active',
        },
        attributes: ['providerId'],
      });
    }

    const subscribedProviderIds = userSubscriptions.map(sub => sub.providerId);

    const providersWithSubscription = providers.map(provider => ({
      ...provider.toJSON(),
      isSubscribed: subscribedProviderIds.includes(provider.id),
      specialties: provider.specialties ? JSON.parse(provider.specialties) : [],
      supportedPairs: provider.supportedPairs ? JSON.parse(provider.supportedPairs) : [],
      performanceData: provider.performanceData ? JSON.parse(provider.performanceData) : [],
    }));

    return successResponse(res, {
      providers: providersWithSubscription,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    }, 'Signal providers fetched successfully');
  } catch (error) {
    console.error('Get signal providers error:', error);
    return errorResponse(res, 'Failed to fetch signal providers', 500);
  }
};

// Get single provider details
exports.getProviderDetails = async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await SignalProvider.findOne({
      where: { id: providerId, status: 'active' },
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'avatar'],
      }],
    });

    if (!provider) {
      return errorResponse(res, 'Provider not found', 404);
    }

    // Check if user is subscribed
    let isSubscribed = false;
    let subscription = null;
    if (req.user) {
      subscription = await SignalSubscription.findOne({
        where: {
          userId: req.user.id,
          providerId,
          status: 'active',
        },
      });
      isSubscribed = !!subscription;
    }

    // Get recent signals (public preview)
    const recentSignals = await Signal.findAll({
      where: { providerId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: isSubscribed ? undefined : ['id', 'pair', 'type', 'status', 'profitLossPercent', 'createdAt', 'closedAt'],
    });

    const providerData = {
      ...provider.toJSON(),
      isSubscribed,
      subscription,
      recentSignals: recentSignals.map(signal => ({
        ...signal.toJSON(),
        tags: signal.tags ? JSON.parse(signal.tags) : [],
      })),
      specialties: provider.specialties ? JSON.parse(provider.specialties) : [],
      supportedPairs: provider.supportedPairs ? JSON.parse(provider.supportedPairs) : [],
      performanceData: provider.performanceData ? JSON.parse(provider.performanceData) : [],
    };

    return successResponse(res, providerData, 'Provider details fetched successfully');
  } catch (error) {
    console.error('Get provider details error:', error);
    return errorResponse(res, 'Failed to fetch provider details', 500);
  }
};
// Subscribe to a signal provider
exports.subscribeToProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { autoRenew = true, autoCopyEnabled = false, autoCopyConfig } = req.body;

    const provider = await SignalProvider.findOne({
      where: { id: providerId, status: 'active' },
    });

    if (!provider) {
      return errorResponse(res, 'Provider not found', 404);
    }

    // Check if already subscribed
    const existingSubscription = await SignalSubscription.findOne({
      where: {
        userId: req.user.id,
        providerId,
        status: 'active',
      },
    });

    if (existingSubscription) {
      return errorResponse(res, 'Already subscribed to this provider', 400);
    }

    // Calculate end date based on price period
    let endDate = null;
    let nextPaymentDate = null;
    
    if (provider.pricePeriod !== 'free' && provider.pricePeriod !== 'lifetime') {
      const now = new Date();
      if (provider.pricePeriod === 'month') {
        endDate = new Date(now.setMonth(now.getMonth() + 1));
        nextPaymentDate = new Date(endDate);
      } else if (provider.pricePeriod === 'year') {
        endDate = new Date(now.setFullYear(now.getFullYear() + 1));
        nextPaymentDate = new Date(endDate);
      }
    }

    // TODO: Process payment if not free

    // Create subscription
    const subscription = await SignalSubscription.create({
      userId: req.user.id,
      providerId,
      price: provider.price,
      pricePeriod: provider.pricePeriod,
      endDate,
      nextPaymentDate,
      autoRenew,
      autoCopyEnabled,
      autoCopyConfig: autoCopyConfig ? JSON.stringify(autoCopyConfig) : null,
      lastPaymentDate: new Date(),
    });

    // Update provider subscribers count
    await provider.increment('subscribers');

    return successResponse(res, subscription, 'Successfully subscribed to provider');
  } catch (error) {
    console.error('Subscribe to provider error:', error);
    return errorResponse(res, 'Failed to subscribe to provider', 500);
  }
};

// Get signals from subscribed providers
exports.getMySignals = async (req, res) => {
  try {
    const { 
      status, 
      type,
      pair,
      providerId,
      page = 1,
      limit = 20
    } = req.query;

    // Get user's subscribed providers
    const subscriptions = await SignalSubscription.findAll({
      where: {
        userId: req.user.id,
        status: 'active',
      },
      attributes: ['providerId'],
    });

    const providerIds = subscriptions.map(sub => sub.providerId);

    if (providerIds.length === 0) {
      return successResponse(res, {
        signals: [],
        pagination: { total: 0, page: 1, limit: parseInt(limit), totalPages: 0 },
      }, 'No subscriptions found');
    }

    const where = {
      providerId: { [Op.in]: providerIds },
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (pair) where.pair = pair;
    if (providerId) where.providerId = providerId;

    const offset = (page - 1) * limit;

    const { count, rows: signals } = await Signal.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [{
        model: SignalProvider,
        as: 'provider',
        attributes: ['id', 'name', 'avatar', 'verified', 'rating'],
      }],
    });

    const signalsData = signals.map(signal => ({
      ...signal.toJSON(),
      tags: signal.tags ? JSON.parse(signal.tags) : [],
    }));

    return successResponse(res, {
      signals: signalsData,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    }, 'Signals fetched successfully');
  } catch (error) {
    console.error('Get my signals error:', error);
    return errorResponse(res, 'Failed to fetch signals', 500);
  }
};

// Get single signal details
exports.getSignalDetails = async (req, res) => {
  try {
    const { signalId } = req.params;

    const signal = await Signal.findOne({
      where: { id: signalId },
      include: [{
        model: SignalProvider,
        as: 'provider',
        attributes: ['id', 'name', 'avatar', 'verified', 'rating'],
      }],
    });

    if (!signal) {
      return errorResponse(res, 'Signal not found', 404);
    }

    // Check if user is subscribed to this provider
    const subscription = await SignalSubscription.findOne({
      where: {
        userId: req.user.id,
        providerId: signal.providerId,
        status: 'active',
      },
    });

    if (!subscription) {
      return errorResponse(res, 'You must be subscribed to this provider to view signal details', 403);
    }

    const signalData = {
      ...signal.toJSON(),
      tags: signal.tags ? JSON.parse(signal.tags) : [],
    };

    return successResponse(res, signalData, 'Signal details fetched successfully');
  } catch (error) {
    console.error('Get signal details error:', error);
    return errorResponse(res, 'Failed to fetch signal details', 500);
  }
};

// Create a signal (for providers)
exports.createSignal = async (req, res) => {
  try {
    const {
      providerId,
      pair,
      type,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      leverage,
      timeframe,
      analysis,
      imageUrl,
      tags,
      confidence,
      expiresAt,
    } = req.body;

    // Verify user owns this provider
    const provider = await SignalProvider.findOne({
      where: { id: providerId, userId: req.user.id },
    });

    if (!provider) {
      return errorResponse(res, 'Provider not found or unauthorized', 403);
    }

    const signal = await Signal.create({
      providerId,
      pair,
      type,
      entryPrice,
      currentPrice: entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      leverage,
      timeframe,
      analysis,
      imageUrl,
      tags: tags ? JSON.stringify(tags) : null,
      confidence,
      expiresAt,
    });

    // Update provider total signals
    await provider.increment('totalSignals');

    // TODO: Notify subscribers

    return successResponse(res, signal, 'Signal created successfully');
  } catch (error) {
    console.error('Create signal error:', error);
    return errorResponse(res, 'Failed to create signal', 500);
  }
};

// Update signal (for providers)
exports.updateSignal = async (req, res) => {
  try {
    const { signalId } = req.params;
    const {
      currentPrice,
      status,
      exitPrice,
      analysis,
    } = req.body;

    const signal = await Signal.findByPk(signalId, {
      include: [{
        model: SignalProvider,
        as: 'provider',
      }],
    });

    if (!signal) {
      return errorResponse(res, 'Signal not found', 404);
    }

    // Verify user owns this provider
    if (signal.provider.userId !== req.user.id) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    const updates = {};
    if (currentPrice) updates.currentPrice = currentPrice;
    if (status) updates.status = status;
    if (exitPrice) updates.exitPrice = exitPrice;
    if (analysis) updates.analysis = analysis;

    // Calculate P/L if closing
    if (status === 'closed' && exitPrice) {
      const profitLoss = ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;
      updates.profitLoss = profitLoss;
      updates.profitLossPercent = profitLoss;
      updates.closedAt = new Date();

      // Update provider stats
      const provider = signal.provider;
      const isWin = profitLoss > 0;
      
      if (isWin) {
        await provider.increment('successfulSignals');
      }

      const totalSignals = provider.totalSignals;
      const successfulSignals = isWin ? provider.successfulSignals + 1 : provider.successfulSignals;
      const newWinRate = (successfulSignals / totalSignals) * 100;
      
      await provider.update({
        winRate: newWinRate.toFixed(2),
        totalProfit: parseFloat(provider.totalProfit) + profitLoss,
      });
    }

    await signal.update(updates);

    return successResponse(res, signal, 'Signal updated successfully');
  } catch (error) {
    console.error('Update signal error:', error);
    return errorResponse(res, 'Failed to update signal', 500);
  }
};

// Delete signal (for providers)
exports.deleteSignal = async (req, res) => {
  try {
    const { signalId } = req.params;

    const signal = await Signal.findByPk(signalId, {
      include: [{
        model: SignalProvider,
        as: 'provider',
      }],
    });

    if (!signal) {
      return errorResponse(res, 'Signal not found', 404);
    }

    // Verify user owns this provider
    if (signal.provider.userId !== req.user.id) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    if (signal.status === 'active') {
      return errorResponse(res, 'Cannot delete active signals. Close them first', 400);
    }

    await signal.destroy();

    return successResponse(res, null, 'Signal deleted successfully');
  } catch (error) {
    console.error('Delete signal error:', error);
    return errorResponse(res, 'Failed to delete signal', 500);
  }
};

// Get provider statistics
exports.getProviderStats = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { timeframe = '30d' } = req.query;

    const provider = await SignalProvider.findByPk(providerId);

    if (!provider) {
      return errorResponse(res, 'Provider not found', 404);
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90d':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case '1y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }

    // Get signals in timeframe
    const signals = await Signal.findAll({
      where: {
        providerId,
        createdAt: { [Op.gte]: startDate },
      },
    });

    const closedSignals = signals.filter(s => s.status === 'closed');
    const winningSignals = closedSignals.filter(s => s.profitLossPercent > 0);
    
    const stats = {
      totalSignals: signals.length,
      closedSignals: closedSignals.length,
      activeSignals: signals.filter(s => s.status === 'active').length,
      winningSignals: winningSignals.length,
      losingSignals: closedSignals.filter(s => s.profitLossPercent < 0).length,
      winRate: closedSignals.length > 0 ? (winningSignals.length / closedSignals.length * 100).toFixed(2) : 0,
      avgProfit: closedSignals.length > 0 ? 
        (closedSignals.reduce((sum, s) => sum + parseFloat(s.profitLossPercent), 0) / closedSignals.length).toFixed(2) : 0,
      totalProfit: closedSignals.reduce((sum, s) => sum + parseFloat(s.profitLossPercent), 0).toFixed(2),
      performanceData: provider.performanceData ? JSON.parse(provider.performanceData) : [],
    };

    return successResponse(res, stats, 'Provider statistics fetched successfully');
  } catch (error) {
    console.error('Get provider stats error:', error);
    return errorResponse(res, 'Failed to fetch provider statistics', 500);
  }
};

// Rate a signal provider
exports.rateProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { rating, review } = req.body;

    if (rating < 1 || rating > 5) {
      return errorResponse(res, 'Rating must be between 1 and 5', 400);
    }

    const subscription = await SignalSubscription.findOne({
      where: {
        userId: req.user.id,
        providerId,
      },
    });

    if (!subscription) {
      return errorResponse(res, 'You must subscribe to this provider to rate them', 403);
    }

    await subscription.update({
      rating,
      review,
      reviewedAt: new Date(),
    });

    // Update provider rating
    const provider = await SignalProvider.findByPk(providerId);
    const allRatings = await SignalSubscription.findAll({
      where: {
        providerId,
        rating: { [Op.not]: null },
      },
      attributes: ['rating'],
    });

    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    await provider.update({ rating: avgRating.toFixed(2) });

    return successResponse(res, subscription, 'Rating submitted successfully');
  } catch (error) {
    console.error('Rate provider error:', error);
    return errorResponse(res, 'Failed to submit rating', 500);
  }
};

// Toggle auto-copy for a subscription
exports.toggleAutoCopy = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { autoCopyEnabled, autoCopyConfig } = req.body;

    const subscription = await SignalSubscription.findOne({
      where: {
        userId: req.user.id,
        providerId,
        status: 'active',
      },
    });

    if (!subscription) {
      return errorResponse(res, 'Subscription not found', 404);
    }

    await subscription.update({
      autoCopyEnabled,
      autoCopyConfig: autoCopyConfig ? JSON.stringify(autoCopyConfig) : subscription.autoCopyConfig,
    });

    return successResponse(res, subscription, 'Auto-copy settings updated successfully');
  } catch (error) {
    console.error('Toggle auto-copy error:', error);
    return errorResponse(res, 'Failed to update auto-copy settings', 500);
  }
};