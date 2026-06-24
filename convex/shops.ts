import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin, requireShopRole, sanitizeShop } from "./auth";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!shop) return null;
    return sanitizeShop(shop);
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

export const resolveLoginToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const inhaberShop = await ctx.db
      .query("shops")
      .withIndex("by_adminLoginToken", (q) => q.eq("adminLoginToken", token))
      .unique();
    if (inhaberShop) {
      return { role: "inhaber" as const, shopSlug: inhaberShop.slug };
    }
    const mitarbeiterShop = await ctx.db
      .query("shops")
      .withIndex("by_mitarbeiterToken", (q) => q.eq("mitarbeiterToken", token))
      .unique();
    if (mitarbeiterShop) {
      return { role: "mitarbeiter" as const, shopSlug: mitarbeiterShop.slug };
    }
    return null;
  },
});

export const getById = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) return null;
    return sanitizeShop(shop);
  },
});

// ─── Inhaber-Mutations ────────────────────────────────────────────────────────

export const updateSettings = mutation({
  args: {
    shopId: v.id("shops"),
    adminToken: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
    rewardTiers: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    stampValue: v.optional(v.number()),
  },
  handler: async (ctx, { shopId, adminToken, stampsRequired, rewardText, rewardTiers, stampValue }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    await ctx.db.patch(shopId, { stampsRequired, rewardText, rewardTiers, stampValue });
  },
});

export const updateMilestones = mutation({
  args: {
    shopId: v.id("shops"),
    adminToken: v.string(),
    milestones: v.array(v.object({ stamps: v.number(), text: v.string(), enabled: v.boolean() })),
  },
  handler: async (ctx, { shopId, adminToken, milestones }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    await ctx.db.patch(shopId, { milestones });
  },
});

export const updateLegalTexts = mutation({
  args: {
    shopId: v.id("shops"),
    inhaberToken: v.string(),
    impressumText: v.optional(v.string()),
    agbText: v.optional(v.string()),
    datenschutzText: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, inhaberToken, impressumText, agbText, datenschutzText }) => {
    await requireShopRole(ctx, { shopId, token: inhaberToken, role: "inhaber" });
    await ctx.db.patch(shopId, { impressumText, agbText, datenschutzText });
  },
});

export const updateShopConfig = mutation({
  args: {
    shopId: v.id("shops"),
    inhaberToken: v.string(),
    accentColor: v.optional(v.string()),
    stampIcon: v.optional(v.string()),
    theme: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, inhaberToken, accentColor, stampIcon, theme }) => {
    await requireShopRole(ctx, { shopId, token: inhaberToken, role: "inhaber" });
    await ctx.db.patch(shopId, { accentColor, stampIcon, theme });
  },
});

// ─── Admin-Mutations (Freischalt-Flags) ──────────────────────────────────────

export const adminUpdateShopContent = mutation({
  args: {
    shopId: v.id("shops"),
    adminSecret: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
    rewardTiers: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    milestones: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    stampValue: v.optional(v.number()),
  },
  handler: async (ctx, { shopId, adminSecret, stampsRequired, rewardText, rewardTiers, milestones, stampValue }) => {
    requireAdmin({ secret: adminSecret });
    await ctx.db.patch(shopId, { stampsRequired, rewardText, rewardTiers, milestones, stampValue });
  },
});

export const adminSetFeatures = mutation({
  args: {
    shopId: v.id("shops"),
    adminSecret: v.string(),
    showLeads: v.optional(v.boolean()),
    bonusProgramEnabled: v.optional(v.boolean()),
    milestonesEnabled: v.optional(v.boolean()),
    customDesignEnabled: v.optional(v.boolean()),
    clearTheme: v.optional(v.boolean()),
    theme: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, adminSecret, ...flags }) => {
    requireAdmin({ secret: adminSecret });
    const patch: Record<string, unknown> = {};
    if (flags.showLeads !== undefined) patch.showLeads = flags.showLeads;
    if (flags.bonusProgramEnabled !== undefined) patch.bonusProgramEnabled = flags.bonusProgramEnabled;
    if (flags.milestonesEnabled !== undefined) patch.milestonesEnabled = flags.milestonesEnabled;
    if (flags.customDesignEnabled !== undefined) patch.customDesignEnabled = flags.customDesignEnabled;
    if (flags.clearTheme) patch.theme = undefined;
    if (flags.theme !== undefined) patch.theme = flags.theme;
    if (flags.accentColor !== undefined) patch.accentColor = flags.accentColor;
    await ctx.db.patch(shopId, patch);
  },
});

export const createShop = mutation({
  args: {
    adminSecret: v.string(),
    name: v.string(),
    slug: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
    stampIcon: v.optional(v.string()),
    stampValue: v.optional(v.number()),
  },
  handler: async (ctx, { adminSecret, ...args }) => {
    requireAdmin({ secret: adminSecret });
    const adminLoginToken = crypto.randomUUID();
    const mitarbeiterToken = crypto.randomUUID();
    return await ctx.db.insert("shops", {
      ...args,
      adminLoginToken,
      mitarbeiterToken,
      createdAt: Date.now(),
    });
  },
});

// ─── Admin-Queries ────────────────────────────────────────────────────────────

export const listAllShops = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    return await ctx.db.query("shops").order("desc").collect();
  },
});

export const getGlobalStats = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const shops = await ctx.db.query("shops").collect();
    const customers = await ctx.db.query("customers").collect();
    const memberships = await ctx.db.query("memberships").collect();
    const totalStamps = memberships.reduce((s, m) => s + m.totalStampsEver, 0);
    const totalRewards = memberships.reduce((s, m) => s + m.rewardsRedeemed, 0);
    const shopsWithCounts = await Promise.all(
      shops.map(async (shop) => {
        const mems = await ctx.db.query("memberships").withIndex("by_shop", (q) => q.eq("shopId", shop._id)).collect();
        return { ...sanitizeShop(shop), customerCount: mems.length };
      })
    );
    return { totalShops: shops.length, totalCustomers: customers.length, totalStamps, totalRewards, shops: shopsWithCounts };
  },
});

export const getGlobalAnalyticsByPeriod = query({
  args: { adminSecret: v.string(), since: v.optional(v.number()) },
  handler: async (ctx, { adminSecret, since }) => {
    requireAdmin({ secret: adminSecret });
    const shops = await ctx.db.query("shops").collect();
    const customers = await ctx.db.query("customers").collect();

    let events = await ctx.db.query("stampEvents").order("desc").collect();
    if (since !== undefined) events = events.filter(e => e.timestamp >= since);

    const stamps   = events.filter(e => e.type === "stamp").length;
    const redeems  = events.filter(e => e.type === "redeem").length;
    const activeShopIds = new Set(events.map(e => e.shopId.toString()));

    const shopsData = await Promise.all(
      shops.map(async (shop) => {
        const shopEvents = events.filter(e => e.shopId === shop._id);
        const shopStamps  = shopEvents.filter(e => e.type === "stamp").length;
        const shopRedeems = shopEvents.filter(e => e.type === "redeem").length;
        const activeMemberIds = new Set(
          (await Promise.all(shopEvents.map(e => ctx.db.get(e.membershipId))))
            .filter(Boolean)
            .map(m => m!.customerId.toString())
        );
        return {
          _id: shop._id,
          name: shop.name,
          slug: shop.slug,
          stamps: shopStamps,
          redeems: shopRedeems,
          activeCustomers: activeMemberIds.size,
        };
      })
    );

    return {
      totalShops: shops.length,
      totalCustomers: customers.length,
      stamps,
      redeems,
      activeShops: activeShopIds.size,
      shops: shopsData.sort((a, b) => b.stamps - a.stamps),
    };
  },
});

export const getShopAnalyticsByPeriod = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), since: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminToken, since }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "mitarbeiter" });

    let events = await ctx.db
      .query("stampEvents")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .collect();
    if (since !== undefined) events = events.filter(e => e.timestamp >= since);

    const stamps  = events.filter(e => e.type === "stamp").length;
    const redeems = events.filter(e => e.type === "redeem").length;

    // Group by membership → customer
    const membershipIds = Array.from(new Set(events.map(e => e.membershipId.toString())));
    const customerRows = await Promise.all(
      membershipIds.map(async (mid) => {
        const mevents = events.filter(e => e.membershipId.toString() === mid);
        const membership = await ctx.db.get(mevents[0].membershipId);
        if (!membership) return null;
        const customer = await ctx.db.get(membership.customerId);
        if (!customer) return null;
        return {
          customerName: customer.name,
          stamps: mevents.filter(e => e.type === "stamp").length,
          redeems: mevents.filter(e => e.type === "redeem").length,
          currentStamps: membership.currentStamps,
          totalStampsEver: membership.totalStampsEver,
          lastEvent: mevents[0].timestamp,
          membershipId: membership._id,
        };
      })
    );

    return {
      stamps,
      redeems,
      customers: customerRows.filter(Boolean).sort((a, b) => b!.stamps - a!.stamps) as NonNullable<typeof customerRows[0]>[],
    };
  },
});

// ─── Inhaber-Queries ──────────────────────────────────────────────────────────

export const listCustomersForShop = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminToken, limit }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "mitarbeiter" });
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

export const adminResetShopCards = mutation({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
    for (const m of memberships) {
      await ctx.db.patch(m._id, { currentStamps: 0, rewardsRedeemed: 0, lastStampAt: undefined });
    }
    return { resetCount: memberships.length };
  },
});

export const inhaberResetShopCards = mutation({
  args: { shopId: v.id("shops"), adminToken: v.string() },
  handler: async (ctx, { shopId, adminToken }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
    for (const m of memberships) {
      await ctx.db.patch(m._id, { currentStamps: 0, rewardsRedeemed: 0, lastStampAt: undefined });
    }
    return { resetCount: memberships.length };
  },
});
