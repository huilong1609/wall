const { Plan, Coupon, UserBalance, sequelize, UserPlan } = require('../models');
const { Op } = require("sequelize");
const { BadRequestError, ValidationError, ConflictError } = require('../utils/errors');
const { generateRandomString, addDuration, toISO } = require('../utils/helpers');

class planService {

    async getPlans() {
        // Mock data for plans
        const plans = await Plan.findAll({
            where: { status: true }
        })


        return {
            plans: plans.map(p => ({
                id: p.id,
                name: p.name,
                badge: p.tagline,
                description: p.description,
                price: p.price,
                maxPrice: p.maxPrice,
                duration: `${p.duration} ${p.duration > 1 ? p.durationType + 's' : p.durationType}`,
                highlight: p.highlight,
                features: p.features,
                limits: p.limits,
                config: p.config
            }))

        }
    }

    async checkCoupon(couponCode, planId) {
        // Mock coupon validation logic
        const coupon = await Coupon.findOne({
            where: { name: couponCode }
        })
        if (!coupon) {
            throw new ValidationError('Invalid coupon code');
        }

        if (!coupon?.applicable?.plans?.includes(planId) && !coupon?.applicable?.plans?.includes('all')) {
            throw new ValidationError('Coupon not applicable for this plan');
        }

        return coupon;
    }
   
    async subscribeToPlan(userId, data) {
    const { planId, coupon, amount } = data;

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new ValidationError("Invalid amount");
    }

    return await sequelize.transaction(async (t) => {
        // 1) Lock user balance row to avoid double-spend
        const balance = await UserBalance.findOne({
            where: { userId },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!balance) {
            throw new ConflictError("User must have a user balance");
        }

        // 2) Get plan
        const plan = await Plan.findOne({
            where: { id: planId },
            transaction: t,
        });

        if (!plan) {
            throw new ConflictError("Plan does not exist");
        }

        const currentBalance = Number(balance.balance ?? 0);
        const minPrice = Number(plan.price ?? 0);

        // maxPrice can be 'Unlimited' (string) or numeric string
        const hasMax =
            plan.maxPrice && String(plan.maxPrice).toLowerCase() !== "unlimited";
        const maxPrice = hasMax ? Number(plan.maxPrice) : null;

        if (amountNum > currentBalance) {
            throw new ValidationError("Insufficient balance");
        }

        if (amountNum < minPrice) {
            throw new ValidationError("Amount is less than the minimum for this plan");
        }

        if (hasMax && Number.isFinite(maxPrice) && amountNum > maxPrice) {
            throw new ValidationError("Amount is greater than the maximum for this plan");
        }

        // 3) Optional: validate coupon (only if provided)
        // NOTE: adapt "name" field if you store coupon code differently.
        let discountApplied = 0;
        let finalAmount = amountNum;

        if (coupon) {
            const c = await Coupon.findOne({
                where: {
                    name: coupon,
                    status: "active",
                    type: { [Op.in]: ["all", "plan"] },
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!c) {
                throw new ValidationError("Invalid or inactive coupon");
            }

            // Basic "plan applicability" example. Adjust to your rules.
            // e.g. applicable: { plans:["basic","pro"] } OR { planIds:[...] }
            const applicable = c.applicable || {};
            if (c.type === "plan") {
                const planIds = applicable.plans || [];
                const planNames = applicable.plans || [];
                const planOk =
                    (Array.isArray(planIds) && planIds.includes(plan.id)) ||
                    (Array.isArray(planNames) &&
                        planNames.map(String).includes(String(plan.name).toLowerCase()));

                if (!planOk && (planIds.length || planNames.length)) {
                    throw new ValidationError("Coupon not applicable to this plan");
                }
            }

            if (c.discount_type === "percent") {
                discountApplied = (finalAmount * Number(c.discount || 0)) / 100;
            } else {
                discountApplied = Number(c.discount || 0);
            }

            // prevent negative / over-discount
            if (discountApplied < 0) discountApplied = 0;
            if (discountApplied > finalAmount) discountApplied = finalAmount;

            finalAmount = finalAmount - discountApplied;

            // Ensure final amount still respects plan minimum (optional rule)
            if (finalAmount < minPrice) {
                throw new ValidationError("Discount makes amount below plan minimum");
            }
        }

        // 4) Create user plan
        const createdPlan = await UserPlan.create(
            {
                planId,
                userId,
                reference: generateRandomString(16),
                amount: amountNum, // amount AFTER discount (change to amountNum if you want original)
                status: "active",
                roi: plan.roi,
                investment_duration: {
                    duration: plan.duration,
                    period: plan.durationType, // make sure field name matches your model (durationType vs duration_type)
                },
                metadata: {
                    roi_type: plan.roiType,
                    roi_interval: plan.roiInterval,
                    coupon: coupon || null,
                    discount_applied: discountApplied,
                    original_amount: amountNum,
                },
                activated_at: new Date(),
            },
            { transaction: t }
        );

        // 5) Update balance
        await balance.update(
            { balance: currentBalance - amountNum }, // debit original amount (or finalAmount if you only want to debit discounted)
            { transaction: t }
        );

        // 6) Optional: mark coupon used (ONLY if your coupon is single-use)
        // await c.update({ status: "used" }, { transaction: t });

        return createdPlan;
    });
}

   async getUserSubscriptions(userId) {
  const { rows: plans } = await UserPlan.findAndCountAll({
    where: { userId },
    include: [{ model: Plan, as: "plan" }],
    order: [["created_at", "DESC"]],
  });

  const totalInvest = plans.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const totalReturn = plans.reduce((sum, p) => sum + Number(p.total_return ?? 0), 0);
  const activeCount = plans.filter((p) => p.status === "active").length;

  return {
    stats: {
      total: plans.length,
      active: activeCount,
      totalInvest,
      totalReturn,
    },
    subscriptions: plans.map((p) => {
      const startedAtRaw = p.created_at ?? p.createdAt ?? new Date();
      const dur = p.investment_duration?.duration ?? p?.plan?.duration ?? 0;
      const period = p.investment_duration?.period ?? p?.plan?.durationType ?? "days";

      const renewsAt = addDuration(startedAtRaw, dur, period);

      return {
        id: p.id,
        reference: p.reference,
        plan: p.plan?.name ?? null,
        duration: dur,
        durationType: period,
        status: p.status,
        startedAt: toISO(startedAtRaw),
        renewsAt: toISO(renewsAt),
        amount: p.amount,
        discount: p.metadata?.discount_applied ?? 0,
      };
    }),
  };
}

}

module.exports = new planService();


