import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const getByAdminToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("shops")
      .withIndex("by_adminLoginToken", (q) => q.eq("adminLoginToken", token))
      .unique();
  },
});

export const getById = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    return await ctx.db.get(shopId);
  },
});

export const updateSettings = mutation({
  args: {
    shopId: v.id("shops"),
    stampsRequired: v.number(),
    rewardText: v.string(),
    rewardTiers: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
  },
  handler: async (ctx, { shopId, stampsRequired, rewardText, rewardTiers }) => {
    await ctx.db.patch(shopId, { stampsRequired, rewardText, rewardTiers });
  },
});

export const toggleShowLeads = mutation({
  args: { shopId: v.id("shops"), showLeads: v.boolean() },
  handler: async (ctx, { shopId, showLeads }) => {
    await ctx.db.patch(shopId, { showLeads });
  },
});

export const toggleBonusProgram = mutation({
  args: { shopId: v.id("shops"), enabled: v.boolean() },
  handler: async (ctx, { shopId, enabled }) => {
    await ctx.db.patch(shopId, { bonusProgramEnabled: enabled });
  },
});

export const setShopColor = mutation({
  args: { shopId: v.id("shops"), accentColor: v.optional(v.string()) },
  handler: async (ctx, { shopId, accentColor }) => {
    await ctx.db.patch(shopId, { accentColor });
  },
});

export const toggleCustomDesign = mutation({
  args: { shopId: v.id("shops"), enabled: v.boolean() },
  handler: async (ctx, { shopId, enabled }) => {
    await ctx.db.patch(shopId, { customDesignEnabled: enabled });
  },
});

export const toggleMilestones = mutation({
  args: { shopId: v.id("shops"), enabled: v.boolean() },
  handler: async (ctx, { shopId, enabled }) => {
    await ctx.db.patch(shopId, { milestonesEnabled: enabled });
  },
});

export const updateMilestones = mutation({
  args: {
    shopId: v.id("shops"),
    milestones: v.array(v.object({ stamps: v.number(), text: v.string(), enabled: v.boolean() })),
  },
  handler: async (ctx, { shopId, milestones }) => {
    await ctx.db.patch(shopId, { milestones });
  },
});

export const updateLegalTexts = mutation({
  args: {
    shopId: v.id("shops"),
    impressumText: v.optional(v.string()),
    agbText: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, impressumText, agbText }) => {
    await ctx.db.patch(shopId, { impressumText, agbText });
  },
});

export const createShop = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
  },
  handler: async (ctx, args) => {
    const adminLoginToken = crypto.randomUUID();
    return await ctx.db.insert("shops", {
      ...args,
      adminLoginToken,
      createdAt: Date.now(),
    });
  },
});

export const listAllShops = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("shops").order("desc").collect();
  },
});

export const getGlobalStats = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    const customers = await ctx.db.query("customers").collect();
    const memberships = await ctx.db.query("memberships").collect();
    const totalStamps = memberships.reduce((s, m) => s + m.totalStampsEver, 0);
    const totalRewards = memberships.reduce((s, m) => s + m.rewardsRedeemed, 0);
    const shopsWithCounts = await Promise.all(
      shops.map(async (shop) => {
        const mems = await ctx.db.query("memberships").withIndex("by_shop", (q) => q.eq("shopId", shop._id)).collect();
        return { ...shop, customerCount: mems.length };
      })
    );
    return { totalShops: shops.length, totalCustomers: customers.length, totalStamps, totalRewards, shops: shopsWithCounts };
  },
});

export const listCustomersForShop = query({
  args: { shopId: v.id("shops"), limit: v.optional(v.number()) },
  handler: async (ctx, { shopId, limit }) => {
    const q = ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc");
    const memberships = limit !== undefined ? await q.take(limit) : await q.collect();

    const results = await Promise.all(
      memberships.map(async (m) => {
        const customer = await ctx.db.get(m.customerId);
        return { membership: m, customer };
      })
    );
    return results.filter((r) => r.customer !== null);
  },
});
