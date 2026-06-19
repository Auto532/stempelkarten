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
  },
  handler: async (ctx, { shopId, stampsRequired, rewardText }) => {
    await ctx.db.patch(shopId, { stampsRequired, rewardText });
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

export const listCustomersForShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();

    const results = await Promise.all(
      memberships.map(async (m) => {
        const customer = await ctx.db.get(m.customerId);
        return { membership: m, customer };
      })
    );
    return results.filter((r) => r.customer !== null);
  },
});
