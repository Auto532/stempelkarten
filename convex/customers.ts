import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByQrToken = query({
  args: { qrToken: v.string() },
  handler: async (ctx, { qrToken }) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
  },
});

export const getMembershipsForCustomer = query({
  args: { qrToken: v.string() },
  handler: async (ctx, { qrToken }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (!customer) return null;

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .collect();

    const withShops = await Promise.all(
      memberships.map(async (m) => {
        const shop = await ctx.db.get(m.shopId);
        if (!shop) return null;
        const { adminLoginToken: _omit, ...publicShop } = shop;
        return { membership: m, shop: publicShop };
      })
    );

    return { customer, memberships: withShops.filter((w) => w !== null) };
  },
});

export const registerCustomer = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    shopSlug: v.string(),
    existingQrToken: v.optional(v.string()),
    acquisitionType: v.optional(v.union(v.literal("new"), v.literal("returning"))),
  },
  handler: async (ctx, { name, phone, shopSlug, existingQrToken, acquisitionType }) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", shopSlug))
      .unique();
    if (!shop) throw new Error("Shop nicht gefunden");

    let customerId;
    let qrToken;

    if (existingQrToken) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_qrToken", (q) => q.eq("qrToken", existingQrToken))
        .unique();
      if (existing) {
        customerId = existing._id;
        qrToken = existingQrToken;
      }
    }

    if (!customerId) {
      // Deduplicate by phone: returning customer gets their old card back
      const byPhone = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first();
      if (byPhone) {
        customerId = byPhone._id;
        qrToken = byPhone.qrToken;
      } else {
        qrToken = crypto.randomUUID();
        customerId = await ctx.db.insert("customers", {
          name,
          phone,
          qrToken: qrToken!,
          createdAt: Date.now(),
        });
      }
    }

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_customer_and_shop", (q) =>
        q.eq("customerId", customerId!).eq("shopId", shop._id)
      )
      .unique();

    if (!existingMembership) {
      await ctx.db.insert("memberships", {
        customerId: customerId!,
        shopId: shop._id,
        currentStamps: 0,
        totalStampsEver: 0,
        rewardsRedeemed: 0,
        acquisitionType,
      });
    }

    return { qrToken: qrToken! };
  },
});
