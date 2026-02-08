const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { BotMarketplace, BotSubscription, UserBalance } = require('../models');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { computeBotEndDate } = require('../utils/helpers')

class BotService {
    async marketplace(userId, filters = {}) {
        const {
            search,
            category,
            sortBy = "popular",
            tier,
            page = 1,
            limit = 20,
        } = filters;

        const offset = (Number(page) - 1) * Number(limit);

        // Build marketplace where clause from filters
        const where = {};

        if (category) where.category = category;
        if (tier) where.tier = tier;

        // If you have a name/title field, adjust accordingly
        // Requires: const { Op } = require("sequelize");
        if (search) {
            where.name = { [Op.iLike]: `%${search}%` }; // Postgres
            // For MySQL use: where.name = { [Op.like]: `%${search}%` };
        }

        // Sort mapping
        const sortMap = {
            popular: [["downloads", "DESC"]],
            newest: [["createdAt", "DESC"]],
            oldest: [["createdAt", "ASC"]],
            // wins: [["performance", "DESC"]],
        };

        const order = sortMap[sortBy] ?? [["createdAt", "DESC"]];

        const [botsResult, totalCount, myBotsResult] = await Promise.all([
            BotMarketplace.findAndCountAll({
                where,
                order,
                include: [{
                    model: BotSubscription,
                    as: 'subscriptions',
                    required: false,
                    paranoid: false,
                },],
                limit: Number(limit),
                offset,

            }),
            BotMarketplace.count({ where }),
            BotSubscription.findAndCountAll({
                where: { userId },
                order: [["createdAt", "DESC"]],
                include: [{
                    model: BotMarketplace,
                    as: 'bot',
                    required: false,
                    paranoid: false,
                },]
            }),
        ]);

        return {
            stats: {
                activeBots: myBotsResult.count,
                totalBots: totalCount,
                totalBotTrade: 0,
                averageWinRate: 0,
            },
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: botsResult.count,
                pages: Math.ceil(botsResult.count / Number(limit)),
            },
            bots: botsResult.rows,
            myBots: myBotsResult.rows,
        };
    }

    async deployBot(userId, botId) {
        // 1) Validate bot exists
        const bot = await BotMarketplace.findByPk(botId);
        if (!bot) {
            throw new NotFoundError("Bot not found");
        }

        // 2) Get user balance (MUST await)
        const userBalance = await UserBalance.findOne({
            where: { userId },
        });

        if (!userBalance) {
            throw new BadRequestError("User balance not found");
        }

        // 3) Check already subscribed (use consistent column names!)
        const existing = await BotSubscription.findOne({
            where: { userId, botMarketplaceId: botId }, // adjust if your FK name differs
        });

        if (existing) {
            throw new BadRequestError("You are already subscribed to this bot");
        }

        // 4) Check funds
        const botPrice = Number(bot.price);
        const balance = Number(userBalance.balance);

        if (Number.isNaN(botPrice) || Number.isNaN(balance)) {
            throw new BadRequestError("Invalid price or balance");
        }

        if (botPrice > balance) {
            throw new BadRequestError("Insufficient balance");
        }

        // 5) Compute subscription dates
        const startDate = new Date();
        const endDate = computeBotEndDate(startDate, bot.pricePeriod);
        // e.g. bot.pricePeriod = "daily" | "weekly" | "monthly" | "yearly"

        // 6) Atomic transaction
        const tx = await sequelize.transaction();
        try {
            const botSubscription = await BotSubscription.create(
                {
                    userId,
                    botMarketplaceId: botId,        // make sure matches your schema
                    pricePeriod: bot.pricePeriod,
                    price: botPrice,
                    startDate,
                    endDate,
                    status: "active",
                },
                { transaction: tx }
            );

            // Update bot stats (optional)
            await bot.increment("activeInstances", { by: 1, transaction: tx });
            await bot.increment("users", { by: 1, transaction: tx });
            await bot.increment("downloads", { by: 1, transaction: tx });

            // Deduct user balance
            await userBalance.decrement("balance", { by: botPrice, transaction: tx });

            await tx.commit();
            return botSubscription;
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }

    async updateBot(userId, botId, status) {
        const tx = await sequelize.transaction();
        try {
            const botSubscription = await BotSubscription.findOne({
                where: { botMarketplaceId: botId, userId },
                transaction: tx,
                lock: tx.LOCK.UPDATE, // prevents race conditions
            });

            if (!botSubscription) {
                throw new BadRequestError("You must subscribe to this bot first");
            }

            if (botSubscription.status == status) {
                throw new BadRequestError(res, 'Bot is already ' + status, 400);
            }

            const now = new Date();

            // Expired subscription check (expired if endDate is in the past or equal)
            if (botSubscription.endDate && new Date(botSubscription.endDate) <= now) {
                throw new BadRequestError("Bot subscription has expired");
            }

            await botSubscription.update(
                {
                    status,
                    updatedAt: new Date(),
                },
                { transaction: tx }
            );

            await tx.commit();
            return botSubscription;
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }

    /*  */
}

module.exports = new BotService();