import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { normalizeEmail } from "./lib/phone";

export const findCustomerByEmail = query({
  args: { email: v.string(), adminToken: v.string() },
  handler: async (ctx, { email, adminToken }) => {
    const shop = await ctx.db
      .query("shops")
      .filter(q => q.eq(q.field("adminLoginToken"), adminToken))
      .first();
    if (!shop) return null;

    const customer = await ctx.db
      .query("customers")
      .withIndex("by_email", q => q.eq("email", normalizeEmail(email)))
      .first();
    if (!customer) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_customer_and_shop", q =>
        q.eq("customerId", customer._id).eq("shopId", shop._id)
      )
      .unique();
    if (!membership) return null;

    return {
      name: customer.name,
      currentStamps: membership.currentStamps,
      qrToken: customer.qrToken,
    };
  },
});

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
        const earlier = await ctx.db
          .query("memberships")
          .withIndex("by_shop", (q) => q.eq("shopId", m.shopId))
          .filter((q) => q.lt(q.field("_creationTime"), m._creationTime))
          .collect();
        const cardNumber = earlier.length + 1;
        return { membership: m, shop: publicShop, cardNumber };
      })
    );

    return { customer, memberships: withShops.filter((w) => w !== null) };
  },
});

export const updateName = mutation({
  args: { qrToken: v.string(), name: v.string() },
  handler: async (ctx, { qrToken, name }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (!customer) throw new Error("Kunde nicht gefunden");
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) throw new Error("Name muss 2–40 Zeichen lang sein");
    await ctx.db.patch(customer._id, { name: trimmed });
  },
});

export const registerCustomer = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    shopSlug: v.string(),
    existingQrToken: v.optional(v.string()),
    acquisitionType: v.optional(v.union(v.literal("new"), v.literal("returning"))),
  },
  handler: async (ctx, { name, email, shopSlug, existingQrToken, acquisitionType }) => {
    const normalized = normalizeEmail(email);
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("Ungültige E-Mail-Adresse");
    }

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
      if (existing && existing.email === normalized) {
        customerId = existing._id;
        qrToken = existingQrToken;
      }
    }

    if (!customerId) {
      // Deduplicate by email: returning customer gets their old card back
      const byEmail = await ctx.db
        .query("customers")
        .withIndex("by_email", (q) => q.eq("email", normalized))
        .first();
      if (byEmail) {
        customerId = byEmail._id;
        qrToken = byEmail.qrToken;
      } else {
        qrToken = crypto.randomUUID();
        customerId = await ctx.db.insert("customers", {
          name,
          email: normalized,
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
        consentedAt: Date.now(),
      });
    }

    return { qrToken: qrToken! };
  },
});

export const migratePhonesToEmail = internalMutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    let migrated = 0;
    for (const c of customers) {
      // @ts-expect-error - old documents may have phone field
      if (c.phone && !c.email) {
        // @ts-expect-error - old documents may have phone field
        await ctx.db.patch(c._id, { email: normalizeEmail(c.phone) });
        migrated++;
      }
    }
    return { migrated, total: customers.length };
  },
});
