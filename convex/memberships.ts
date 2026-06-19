import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getForCustomerAndShop = query({
  args: { qrToken: v.string(), shopId: v.id("shops") },
  handler: async (ctx, { qrToken, shopId }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (!customer) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_customer_and_shop", (q) =>
        q.eq("customerId", customer._id).eq("shopId", shopId)
      )
      .unique();

    return { customer, membership };
  },
});

export const createMembershipForExistingCustomer = mutation({
  args: { qrToken: v.string(), shopId: v.id("shops") },
  handler: async (ctx, { qrToken, shopId }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (!customer) throw new Error("Kunde nicht gefunden");

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_customer_and_shop", (q) =>
        q.eq("customerId", customer._id).eq("shopId", shopId)
      )
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("memberships", {
      customerId: customer._id,
      shopId,
      currentStamps: 0,
      totalStampsEver: 0,
      rewardsRedeemed: 0,
    });
  },
});

export const addStamp = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new Error("Mitgliedschaft nicht gefunden");

    const shop = await ctx.db.get(membership.shopId);
    if (!shop) throw new Error("Shop nicht gefunden");

    const newStamps = membership.currentStamps + 1;
    const rewardReached = newStamps >= shop.stampsRequired;

    await ctx.db.patch(membershipId, {
      currentStamps: newStamps,
      totalStampsEver: membership.totalStampsEver + 1,
      lastStampAt: Date.now(),
    });

    await ctx.db.insert("stampEvents", {
      membershipId,
      shopId: membership.shopId,
      type: "stamp",
      timestamp: Date.now(),
    });

    return { rewardReached, stampsRequired: shop.stampsRequired };
  },
});

export const redeemReward = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new Error("Mitgliedschaft nicht gefunden");

    await ctx.db.patch(membershipId, {
      currentStamps: 0,
      rewardsRedeemed: membership.rewardsRedeemed + 1,
    });

    await ctx.db.insert("stampEvents", {
      membershipId,
      shopId: membership.shopId,
      type: "redeem",
      timestamp: Date.now(),
    });
  },
});
