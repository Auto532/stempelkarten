import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireShopRole } from "./auth";

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
  args: {
    qrToken: v.string(),
    shopId: v.id("shops"),
    acquisitionType: v.optional(v.union(v.literal("new"), v.literal("returning"))),
  },
  handler: async (ctx, { qrToken, shopId, acquisitionType }) => {
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
      acquisitionType,
    });
  },
});

export const addStamp = mutation({
  args: { membershipId: v.id("memberships"), adminToken: v.string() },
  handler: async (ctx, { membershipId, adminToken }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new Error("Mitgliedschaft nicht gefunden");

    await requireShopRole(ctx, { shopId: membership.shopId, token: adminToken, role: "mitarbeiter" });
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
  args: { membershipId: v.id("memberships"), adminToken: v.string(), rewardText: v.optional(v.string()) },
  handler: async (ctx, { membershipId, adminToken, rewardText }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new Error("Mitgliedschaft nicht gefunden");

    await requireShopRole(ctx, { shopId: membership.shopId, token: adminToken, role: "mitarbeiter" });
    const shop = await ctx.db.get(membership.shopId);
    if (!shop) throw new Error("Shop nicht gefunden");

    const carryOver = Math.max(0, membership.currentStamps - shop.stampsRequired);

    await ctx.db.patch(membershipId, {
      currentStamps: carryOver,
      rewardsRedeemed: membership.rewardsRedeemed + 1,
    });

    await ctx.db.insert("stampEvents", {
      membershipId,
      shopId: membership.shopId,
      type: "redeem",
      rewardText,
      timestamp: Date.now(),
    });
  },
});

export const customerRedeemReward = mutation({
  args: { qrToken: v.string(), membershipId: v.id("memberships"), targetStamps: v.optional(v.number()) },
  handler: async (ctx, { qrToken, membershipId, targetStamps }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (!customer) throw new Error("Kunde nicht gefunden");

    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new Error("Mitgliedschaft nicht gefunden");
    if (membership.customerId !== customer._id) throw new Error("Nicht berechtigt");

    const shop = await ctx.db.get(membership.shopId);
    if (!shop) throw new Error("Shop nicht gefunden");

    const activeTiers = (shop.rewardTiers ?? [])
      .filter((t) => t.enabled)
      .sort((a, b) => a.stamps - b.stamps);

    const baseTier = { stamps: shop.stampsRequired, text: shop.rewardText };
    const tiers = activeTiers.length > 0 ? activeTiers : [baseTier];
    const eligible = targetStamps !== undefined
      ? tiers.find((t) => t.stamps === targetStamps && membership.currentStamps >= t.stamps)
      : tiers.find((t) => membership.currentStamps >= t.stamps);
    if (!eligible) throw new Error("Keine Belohnung verfügbar");

    const carryOver = Math.max(0, membership.currentStamps - eligible.stamps);
    await ctx.db.patch(membershipId, {
      currentStamps: carryOver,
      rewardsRedeemed: membership.rewardsRedeemed + 1,
    });
    await ctx.db.insert("stampEvents", {
      membershipId,
      shopId: membership.shopId,
      type: "redeem",
      rewardText: eligible.text,
      timestamp: Date.now(),
    });

    return { rewardText: eligible.text };
  },
});

export const getRedemptionsForShop = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminToken, limit }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "mitarbeiter" });
    const q = ctx.db
      .query("stampEvents")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .filter((q) => q.eq(q.field("type"), "redeem"))
      .order("desc");
    const events = limit !== undefined ? await q.take(limit) : await q.collect();

    const results = await Promise.all(
      events.map(async (event) => {
        const membership = await ctx.db.get(event.membershipId);
        if (!membership) return null;
        const customer = await ctx.db.get(membership.customerId);
        if (!customer) return null;
        return {
          _id: event._id,
          customerName: customer.name,
          rewardText: event.rewardText ?? null,
          timestamp: event.timestamp,
        };
      })
    );
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});
