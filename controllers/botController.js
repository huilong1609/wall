const botService = require('../services/botService');
const ApiResponse = require('../utils/apiResponse');
const { Op } = require('sequelize');

// Get all marketplace bots
exports.getMarketplaceBots = async (req, res) => {
  const bots = await botService.marketplace(req.user.id);
  ApiResponse.success(res, bots);
 
};

exports.deployBot = async (req, res) => {
  const {botMarketplaceId} = req.params;
  const { botId } = req.body;
  if(!botMarketplaceId){
    return ApiResponse.notFound(res , 'invalid link')
  }
  if(botMarketplaceId !== botId){
    return ApiResponse.error(res , 'invalid bot')
  }
  const subscriptionBots = await botService.deployBot(req.user.id , botMarketplaceId);
  return ApiResponse.success(res, subscriptionBots ,  'Bot ubsuccessful')
};


exports.pauseBot = async (req, res) => {
  const {botId} = req.params;
  if(!botId){
    return ApiResponse.notFound(res , 'invalid bot')
  }
  
  const subscriptionBots = await botService.updateBot(req.user.id , botId , 'paused');
  return ApiResponse.success(res, subscriptionBots ,  'Bot paused successfully')
};

exports.resumeBot = async (req, res) => {
  const {botId} = req.params;
  if(!botId){
    return ApiResponse.notFound(res , 'invalid bot')
  }
  
  const subscriptionBots = await botService.updateBot(req.user.id , botId , 'active');
  return ApiResponse.success(res, subscriptionBots ,  'Bot resumed successfully')
};

// Get single marketplace bot details
exports.getMarketplaceBotDetails = async (req, res) => {
  try {
    const { botId } = req.params;

    const bot = await BotMarketplace.findOne({
      where: { id: botId, isPublished: true },
    });

    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }

    // Check if user is subscribed
    let isSubscribed = false;
    if (req.user) {
      const subscription = await BotSubscription.findOne({
        where: {
          userId: req.user.id,
          botMarketplaceId: botId,
          status: 'active',
        },
      });
      isSubscribed = !!subscription;
    }

    const botData = {
      ...bot.toJSON(),
      isSubscribed,
      performance: JSON.parse(bot.performance),
      supportedPairs: JSON.parse(bot.supportedPairs),
      supportedExchanges: JSON.parse(bot.supportedExchanges),
      features: JSON.parse(bot.features),
      tags: bot.tags ? JSON.parse(bot.tags) : [],
      chartData: bot.chartData ? JSON.parse(bot.chartData) : [],
      defaultConfig: JSON.parse(bot.defaultConfig),
    };

    // Only include strategy code if user is subscribed
    if (isSubscribed) {
      botData.strategyCode = bot.strategyCode;
    }

    return successResponse(res, botData, 'Bot details fetched successfully');
  } catch (error) {
    console.error('Get bot details error:', error);
    return errorResponse(res, 'Failed to fetch bot details', 500);
  }
};

// Subscribe to a marketplace bot
exports.subscribeToBot = async (req, res) => {
  try {
    const { botId } = req.params;
    const { autoRenew = true } = req.body;

    const bot = await BotMarketplace.findOne({
      where: { id: botId, isPublished: true },
    });

    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }

    // Check if already subscribed
    const existingSubscription = await BotSubscription.findOne({
      where: {
        userId: req.user.id,
        botMarketplaceId: botId,
        status: 'active',
      },
    });

    if (existingSubscription) {
      return errorResponse(res, 'Already subscribed to this bot', 400);
    }

    // Calculate end date based on price period
    let endDate = null;
    let nextPaymentDate = null;
    
    if (bot.pricePeriod !== 'free' && bot.pricePeriod !== 'lifetime') {
      const now = new Date();
      if (bot.pricePeriod === 'month') {
        endDate = new Date(now.setMonth(now.getMonth() + 1));
        nextPaymentDate = new Date(endDate);
      } else if (bot.pricePeriod === 'year') {
        endDate = new Date(now.setFullYear(now.getFullYear() + 1));
        nextPaymentDate = new Date(endDate);
      }
    }

    // TODO: Process payment if not free

    // Create subscription
    const subscription = await BotSubscription.create({
      userId: req.user.id,
      botMarketplaceId: botId,
      price: bot.price,
      pricePeriod: bot.pricePeriod,
      endDate,
      nextPaymentDate,
      autoRenew,
      lastPaymentDate: new Date(),
    });

    // Update bot users count
    await bot.increment('users');
    await bot.increment('downloads');

    return successResponse(res, subscription, 'Successfully subscribed to bot');
  } catch (error) {
    console.error('Subscribe to bot error:', error);
    return errorResponse(res, 'Failed to subscribe to bot', 500);
  }
};

// Get user's active bots
exports.getMyBots = async (req, res) => {
  try {
    const bots = await Bot.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    const botsData = bots.map(bot => ({
      ...bot.toJSON(),
      strategy: JSON.parse(bot.strategy),
      config: bot.config ? JSON.parse(bot.config) : null,
      riskSettings: bot.riskSettings ? JSON.parse(bot.riskSettings) : null,
      performanceData: bot.performanceData ? JSON.parse(bot.performanceData) : null,
    }));

    return successResponse(res, botsData, 'User bots fetched successfully');
  } catch (error) {
    console.error('Get my bots error:', error);
    return errorResponse(res, 'Failed to fetch user bots', 500);
  }
};
// Deploy a bot from marketplace


exports.deployBots = async (req, res) => {
  try {
    const { botMarketplaceId } = req.params;
    const { name, pair, exchange, capital, config } = req.body;

    // Check subscription
    const subscription = await BotSubscription.findOne({
      where: {
        userId: req.user.id,
        botMarketplaceId,
        status: 'active',
      },
    });

    if (!subscription) {
      return errorResponse(res, 'You must subscribe to this bot first', 403);
    }

    const marketplaceBot = await BotMarketplace.findByPk(botMarketplaceId);
    if (!marketplaceBot) {
      return errorResponse(res, 'Bot not found', 404);
    }

    // Create user bot instance
    const bot = await Bot.create({
      userId: req.user.id,
      name: name || marketplaceBot.name,
      description: marketplaceBot.description,
      category: marketplaceBot.category,
      strategy: marketplaceBot.strategyCode,
      pair,
      exchange,
      capital,
      currentValue: capital,
      status: 'draft',
      config: JSON.stringify(config || JSON.parse(marketplaceBot.defaultConfig)),
    });

    // Update marketplace bot active instances
    await marketplaceBot.increment('activeInstances');

    return successResponse(res, bot, 'Bot deployed successfully');
  } catch (error) {
    console.error('Deploy bot error:', error);
    return errorResponse(res, 'Failed to deploy bot', 500);
  }
};

// Start a bot
exports.startBot = async (req, res) => {
  try {
    const { botId } = req.params;

    const bot = await Bot.findOne({
      where: { id: botId, userId: req.user.id },
    });

    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }

    if (bot.status === 'running') {
      return errorResponse(res, 'Bot is already running', 400);
    }

    await bot.update({
      status: 'running',
      startedAt: new Date(),
      errorMessage: null,
    });

    // TODO: Actually start the bot trading logic

    return successResponse(res, bot, 'Bot started successfully');
  } catch (error) {
    console.error('Start bot error:', error);
    return errorResponse(res, 'Failed to start bot', 500);
  }
};

// Stop a bot
exports.stopBot = async (req, res) => {
  try {
    const { botId } = req.params;

    const bot = await Bot.findOne({
      where: { id: botId, userId: req.user.id },
    });

    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }

    await bot.update({
      status: 'stopped',
      stoppedAt: new Date(),
    });

    // TODO: Actually stop the bot trading logic

    return successResponse(res, bot, 'Bot stopped successfully');
  } catch (error) {
    console.error('Stop bot error:', error);
    return errorResponse(res, 'Failed to stop bot', 500);
  }
};

// Pause a bot


// Update bot config
exports.updateBotConfig = async (req, res) => {
  try {
    const { botId } = req.params;
    const { config, riskSettings } = req.body;

    const bot = await Bot.findOne({
      where: { id: botId, userId: req.user.id },
    });

    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }

    if (bot.status === 'running') {
      return errorResponse(res, 'Cannot update config while bot is running', 400);
    }

    await bot.update({
      config: config ? JSON.stringify(config) : bot.config,
      riskSettings: riskSettings ? JSON.stringify(riskSettings) : bot.riskSettings,
    });

    return successResponse(res, bot, 'Bot configuration updated successfully');
  } catch (error) {
    console.error('Update bot config error:', error);
    return errorResponse(res, 'Failed to update bot configuration', 500);
  }
};

// Delete a bot
exports.deleteBot = async (req, res) => {
  try {
    const { botId } = req.params;

    const bot = await Bot.findOne({
      where: { id: botId, userId: req.user.id },
    });

    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }

    if (bot.status === 'running') {
      return errorResponse(res, 'Cannot delete a running bot. Stop it first', 400);
    }

    await bot.destroy();

    return successResponse(res, null, 'Bot deleted successfully');
  } catch (error) {
    console.error('Delete bot error:', error);
    return errorResponse(res, 'Failed to delete bot', 500);
  }
};

// Get bot statistics
exports.getBotStats = async (req, res) => {
  try {
    const { botId } = req.params;
    const { timeframe = '30d' } = req.query;

    const bot = await Bot.findOne({
      where: { id: botId, userId: req.user.id },
    });

    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }

    // TODO: Calculate detailed statistics based on timeframe
    const stats = {
      profit: bot.profit,
      profitPercent: bot.profitPercent,
      totalTrades: bot.totalTrades,
      winRate: bot.winRate,
      maxDrawdown: bot.maxDrawdown,
      runtime: bot.runtime,
      performanceData: bot.performanceData ? JSON.parse(bot.performanceData) : [],
    };

    return successResponse(res, stats, 'Bot statistics fetched successfully');
  } catch (error) {
    console.error('Get bot stats error:', error);
    return errorResponse(res, 'Failed to fetch bot statistics', 500);
  }
};

// Rate a marketplace bot
exports.rateBotMarketplace = async (req, res) => {
  try {
    const { botId } = req.params;
    const { rating, review } = req.body;

    if (rating < 1 || rating > 5) {
      return errorResponse(res, 'Rating must be between 1 and 5', 400);
    }

    const subscription = await BotSubscription.findOne({
      where: {
        userId: req.user.id,
        botMarketplaceId: botId,
      },
    });

    if (!subscription) {
      return errorResponse(res, 'You must subscribe to this bot to rate it', 403);
    }

    await subscription.update({
      rating,
      review,
      reviewedAt: new Date(),
    });

    // Update marketplace bot rating
    const bot = await BotMarketplace.findByPk(botId);
    const allRatings = await BotSubscription.findAll({
      where: {
        botMarketplaceId: botId,
        rating: { [Op.not]: null },
      },
      attributes: ['rating'],
    });

    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    await bot.update({
      rating: avgRating.toFixed(2),
      reviews: allRatings.length,
    });

    return successResponse(res, subscription, 'Rating submitted successfully');
  } catch (error) {
    console.error('Rate bot error:', error);
    return errorResponse(res, 'Failed to submit rating', 500);
  }
};

