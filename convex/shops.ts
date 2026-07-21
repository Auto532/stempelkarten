import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin, requireShopRole, sanitizeShop } from "./auth";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";


export const provisionShopFromAffiliate = internalMutation({
  args: {
    shopName:        v.string(),
    affiliateLeadId: v.string(),
  },
  handler: async (ctx, args) => {
    const umlautMap: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
    const base = args.shopName.toLowerCase()
      .replace(/[äöüß]/g, c => umlautMap[c] ?? c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "shop";

    let slug = base;
    for (let i = 1; i < 100; i++) {
      const exists = await ctx.db.query("shops").withIndex("by_slug", q => q.eq("slug", slug)).unique();
      if (!exists) break;
      slug = `${base}-${i}`;
    }

    const adminLoginToken    = crypto.randomUUID();
    const mitarbeiterToken   = crypto.randomUUID();

    const shopId = await ctx.db.insert("shops", {
      name:            args.shopName,
      slug,
      stampsRequired:  10,
      rewardText:      "Gratis-Produkt nach 10 Stempeln",
      adminLoginToken,
      mitarbeiterToken,
      createdAt:       Date.now(),
    });

    return { shopId: shopId as string, slug, adminLoginToken };
  },
});

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
    // Abrechnung folgt den echten Bonus-Stufen (auch bei Inhaber-Änderungen)
    await ctx.scheduler.runAfter(0, internal.billingSync.syncBonusBilling, { shopId });
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

export const updatePriceInfo = mutation({
  args: {
    shopId: v.id("shops"),
    adminSecret: v.string(),
    priceInfo: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, adminSecret, priceInfo }) => {
    requireAdmin({ secret: adminSecret });
    await ctx.db.patch(shopId, { priceInfo });
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
    // Abrechnung folgt den echten Bonus-Stufen
    await ctx.scheduler.runAfter(0, internal.billingSync.syncBonusBilling, { shopId });
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
    active: v.optional(v.boolean()),
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
    if (flags.active !== undefined) patch.active = flags.active;
    if (flags.clearTheme) patch.theme = undefined;
    if (flags.theme !== undefined) patch.theme = flags.theme;
    if (flags.accentColor !== undefined) patch.accentColor = flags.accentColor;
    await ctx.db.patch(shopId, patch);

    // Bonus-Toggle wirkt auf die Abrechnung: an → aktive Zusatz-Stufen zählen,
    // aus → 0 Belohnungen berechnet.
    if (flags.bonusProgramEnabled !== undefined) {
      await ctx.scheduler.runAfter(0, internal.billingSync.syncBonusBilling, { shopId });
    }
  },
});

// ── Config-Design (Admin-Editor) ──────────────────────────────────────────────

// Upload-URL für Logo/Hintergrundbild (Convex File Storage), admin-gated.
export const adminGenerateUploadUrl = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    return await ctx.storage.generateUploadUrl();
  },
});

// Speichert das Config-Design eines Shops. Bild-URLs werden hier serverseitig
// aus den Storage-IDs aufgelöst und mitgespeichert, damit die Kunden-Seiten
// keine extra Storage-Queries brauchen. config = null löscht das Design.
export const adminSetDesignConfig = mutation({
  args: {
    shopId:      v.id("shops"),
    adminSecret: v.string(),
    config: v.union(v.null(), v.object({
      accent:    v.string(),
      text:      v.string(),
      textBody:  v.string(),
      cardBg:    v.string(),
      bgType:    v.union(v.literal("color"), v.literal("gradient"), v.literal("image")),
      bgColor:   v.optional(v.string()),
      bgColor2:  v.optional(v.string()),
      bgImageId: v.optional(v.id("_storage")),
      logoId:    v.optional(v.id("_storage")),
      logoSize:  v.optional(v.union(v.literal("s"), v.literal("m"), v.literal("l"))),
      stampIcon: v.optional(v.string()),
      cardStyle: v.optional(v.union(v.literal("classic"), v.literal("glow"), v.literal("paper"))),
      decor:     v.optional(v.string()),
    })),
  },
  handler: async (ctx, { shopId, adminSecret, config }) => {
    requireAdmin({ secret: adminSecret });

    if (config === null) {
      await ctx.db.patch(shopId, { designConfig: undefined });
      return;
    }

    const bgImageUrl = config.bgImageId ? (await ctx.storage.getUrl(config.bgImageId)) ?? undefined : undefined;
    const logoUrl    = config.logoId    ? (await ctx.storage.getUrl(config.logoId))    ?? undefined : undefined;

    await ctx.db.patch(shopId, {
      designConfig: { ...config, bgImageUrl, logoUrl },
      // Ein aktives Signature-Theme würde den Editor überdecken — beim Speichern
      // des Config-Designs wird es deshalb entfernt (was du speicherst, siehst du).
      theme: undefined,
    });
  },
});

// Shop komplett löschen (Admin) — inkl. aller shop-bezogenen Daten.
// Kunden bleiben erhalten (können in anderen Shops Mitgliedschaften haben).
export const adminDeleteShop = mutation({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new ConvexError("Shop nicht gefunden");

    const [stampEvents, messages, memberships] = await Promise.all([
      ctx.db.query("stampEvents").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect(),
      ctx.db.query("messages").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect(),
      ctx.db.query("memberships").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect(),
    ]);

    for (const doc of [...stampEvents, ...messages, ...memberships]) {
      await ctx.db.delete(doc._id);
    }
    if (shop.ownerId) {
      const owner = await ctx.db.get(shop.ownerId);
      if (owner) await ctx.db.delete(owner._id);
    }
    await ctx.db.delete(shopId);

    return {
      deletedMemberships: memberships.length,
      deletedStampEvents: stampEvents.length,
      deletedMessages:    messages.length,
    };
  },
});

export const createShop = mutation({
  args: {
    adminSecret:      v.string(),
    name:             v.string(),
    slug:             v.string(),
    stampsRequired:   v.number(),
    rewardText:       v.string(),
    stampIcon:        v.optional(v.string()),
    stampValue:       v.optional(v.number()),
    ownerName:        v.optional(v.string()),
    ownerEmail:       v.optional(v.string()),
    ownerPhone:       v.optional(v.string()),
    rewardCount:      v.optional(v.number()),
  },
  handler: async (ctx, { adminSecret, ownerName, ownerEmail, ownerPhone, rewardCount, ...shopArgs }) => {
    requireAdmin({ secret: adminSecret });

    // Slug muss eindeutig sein: getBySlug/Join-Links laufen über .unique() und
    // brechen bei Doppelbelegung für ALLE Shops mit diesem Slug. (.first statt
    // .unique, damit der Check auch funktioniert, falls es schon Altlasten gibt.)
    const slugTaken = await ctx.db.query("shops")
      .withIndex("by_slug", q => q.eq("slug", shopArgs.slug))
      .first();
    if (slugTaken) throw new ConvexError(`Slug "${shopArgs.slug}" ist schon vergeben, bitte anderes URL-Kürzel wählen`);

    const adminLoginToken  = crypto.randomUUID();
    const mitarbeiterToken = crypto.randomUUID();

    let ownerId: Id<"owners"> | undefined;
    if (ownerName || ownerEmail) {
      ownerId = await ctx.db.insert("owners", {
        name:      ownerName ?? "",
        email:     ownerEmail,
        phone:     ownerPhone,
        createdAt: Date.now(),
      });
    }

    const shopId = await ctx.db.insert("shops", {
      ...shopArgs,
      ownerId,
      adminLoginToken,
      mitarbeiterToken,
      createdAt: Date.now(),
    });

    // Keine Willkommens-Mail mehr beim Anlegen: die Mails (Willkommen +
    // Zahlungsbestätigung) verschickt die Affiliate-App erst nach dem
    // Zahlungseingang (autoRecordPayment). Wer "Später zahlen" wählt,
    // bekommt bis zur Zahlung nichts.

    return { shopId, slug: shopArgs.slug, adminLoginToken };
  },
});

// ─── Admin-Queries ────────────────────────────────────────────────────────────

export const listAllShops = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const shops = await ctx.db.query("shops").order("desc").collect();
    return shops.map(sanitizeShop);
  },
});

export const getLoginLinksForShop = query({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const shop = await ctx.db.get(shopId);
    if (!shop) return null;
    return {
      adminLoginToken: shop.adminLoginToken,
      mitarbeiterToken: shop.mitarbeiterToken ?? null,
    };
  },
});

export const listCustomersForShopAsAdmin = query({
  args: { shopId: v.id("shops"), adminSecret: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminSecret, limit }) => {
    requireAdmin({ secret: adminSecret });
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

export const getShopAnalyticsByPeriodAsAdmin = query({
  args: { shopId: v.id("shops"), adminSecret: v.string(), since: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminSecret, since }) => {
    requireAdmin({ secret: adminSecret });
    const shop = await ctx.db.get(shopId);

    let events = await ctx.db
      .query("stampEvents")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .collect();
    if (since !== undefined) events = events.filter(e => e.timestamp >= since);

    const stamps  = events.filter(e => e.type === "stamp").length;
    const redeems = events.filter(e => e.type === "redeem").length;

    const redeemEvents = events.filter(e => e.type === "redeem");
    const rewardMap = new Map<string, number>();
    for (const e of redeemEvents) {
      const text = e.rewardText ?? shop?.rewardText ?? "";
      if (text) rewardMap.set(text, (rewardMap.get(text) ?? 0) + 1);
    }
    const allTiers = [
      ...(shop ? [{ stamps: shop.stampsRequired, text: shop.rewardText }] : []),
      ...(shop?.rewardTiers?.filter(t => t.enabled) ?? []),
    ];
    const rewardBreakdown = Array.from(rewardMap.entries()).map(([text, count]) => {
      const tier = allTiers.find(t => t.text === text);
      const tierStamps = tier?.stamps ?? shop?.stampsRequired ?? 0;
      const valuePerRedemption = shop?.stampValue != null ? tierStamps * shop.stampValue : null;
      return { rewardText: text, count, valuePerRedemption };
    }).sort((a, b) => b.count - a.count);

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
      stampValue: shop?.stampValue ?? null,
      rewardBreakdown,
      customers: customerRows.filter(Boolean).sort((a, b) => b!.stamps - a!.stamps) as NonNullable<typeof customerRows[0]>[],
    };
  },
});

export const adminUpdateLegalTexts = mutation({
  args: {
    shopId: v.id("shops"),
    adminSecret: v.string(),
    impressumText: v.optional(v.string()),
    agbText: v.optional(v.string()),
    datenschutzText: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, adminSecret, impressumText, agbText, datenschutzText }) => {
    requireAdmin({ secret: adminSecret });
    await ctx.db.patch(shopId, { impressumText, agbText, datenschutzText });
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
  args: {
    adminSecret: v.string(),
    since: v.optional(v.number()),
    prevSince: v.optional(v.number()),
  },
  handler: async (ctx, { adminSecret, since, prevSince }) => {
    requireAdmin({ secret: adminSecret });
    const shops     = await ctx.db.query("shops").collect();
    const customers = await ctx.db.query("customers").collect();

    const allEvents = await ctx.db.query("stampEvents").order("desc").collect();

    // Current period
    const events = since !== undefined ? allEvents.filter(e => e.timestamp >= since) : allEvents;
    const stamps  = events.filter(e => e.type === "stamp").length;
    const redeems = events.filter(e => e.type === "redeem").length;
    const activeShopIds = new Set(events.map(e => e.shopId.toString()));

    // Previous period (for growth %)
    const prevUntil = since;
    const prevEvents = (prevSince !== undefined && prevUntil !== undefined)
      ? allEvents.filter(e => e.timestamp >= prevSince && e.timestamp < prevUntil)
      : [];
    const prevStamps  = prevEvents.filter(e => e.type === "stamp").length;
    const prevRedeems = prevEvents.filter(e => e.type === "redeem").length;

    // New customers in period
    const allMemberships = await ctx.db.query("memberships").collect();
    const newMemberships = since !== undefined
      ? allMemberships.filter(m => m._creationTime >= since)
      : allMemberships;
    const newCustomerIds = new Set(newMemberships.map(m => m.customerId.toString()));

    // Daily breakdown (last 60 days max)
    const DAY_MS = 24 * 60 * 60 * 1000;
    const dayMap = new Map<number, { stamps: number; redeems: number }>();
    for (const e of events) {
      const day = Math.floor(e.timestamp / DAY_MS) * DAY_MS;
      const cur = dayMap.get(day) ?? { stamps: 0, redeems: 0 };
      if (e.type === "stamp")  cur.stamps++;
      else                     cur.redeems++;
      dayMap.set(day, cur);
    }
    const dailyBreakdown = Array.from(dayMap.entries())
      .map(([dayStart, v]) => ({ dayStart, ...v }))
      .sort((a, b) => a.dayStart - b.dayStart)
      .slice(-60);

    // Top customers (by stamps in period)
    const membershipStampMap = new Map<string, number>();
    events.filter(e => e.type === "stamp").forEach(e => {
      const k = e.membershipId.toString();
      membershipStampMap.set(k, (membershipStampMap.get(k) ?? 0) + 1);
    });
    const top10ids = Array.from(membershipStampMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topCustomers = (await Promise.all(
      top10ids.map(async ([mid, s]) => {
        const membership = await ctx.db.get(mid as Id<"memberships">);
        if (!membership) return null;
        const customer = await ctx.db.get(membership.customerId);
        if (!customer) return null;
        const shop = shops.find(sh => sh._id === membership.shopId);
        return { name: customer.name, stamps: s, shopName: shop?.name ?? "" };
      })
    )).filter(Boolean) as { name: string; stamps: number; shopName: string }[];

    // Per-shop breakdown
    const shopsData = await Promise.all(
      shops.map(async (shop) => {
        const shopEvents = events.filter(e => e.shopId === shop._id);
        const shopStamps  = shopEvents.filter(e => e.type === "stamp").length;
        const shopRedeems = shopEvents.filter(e => e.type === "redeem").length;
        const activeMemberIds = new Set(
          (await Promise.all(shopEvents.map(e => ctx.db.get(e.membershipId))))
            .filter(Boolean).map(m => m!.customerId.toString())
        );
        return { _id: shop._id, name: shop.name, slug: shop.slug, stamps: shopStamps, redeems: shopRedeems, activeCustomers: activeMemberIds.size };
      })
    );

    return {
      totalShops: shops.length,
      totalCustomers: customers.length,
      stamps,
      redeems,
      activeShops: activeShopIds.size,
      newCustomers: newCustomerIds.size,
      prevStamps,
      prevRedeems,
      dailyBreakdown,
      topCustomers,
      shops: shopsData.sort((a, b) => b.stamps - a.stamps),
    };
  },
});

export const getShopAnalyticsByPeriod = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), since: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminToken, since }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });

    const shop = await ctx.db.get(shopId);

    let events = await ctx.db
      .query("stampEvents")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .collect();
    if (since !== undefined) events = events.filter(e => e.timestamp >= since);

    const stamps  = events.filter(e => e.type === "stamp").length;
    const redeems = events.filter(e => e.type === "redeem").length;

    // Reward breakdown
    const redeemEvents = events.filter(e => e.type === "redeem");
    const rewardMap = new Map<string, number>();
    for (const e of redeemEvents) {
      const text = e.rewardText ?? shop?.rewardText ?? "";
      if (text) rewardMap.set(text, (rewardMap.get(text) ?? 0) + 1);
    }
    const allTiers = [
      ...(shop ? [{ stamps: shop.stampsRequired, text: shop.rewardText }] : []),
      ...(shop?.rewardTiers?.filter(t => t.enabled) ?? []),
    ];
    const rewardBreakdown = Array.from(rewardMap.entries()).map(([text, count]) => {
      const tier = allTiers.find(t => t.text === text);
      const tierStamps = tier?.stamps ?? shop?.stampsRequired ?? 0;
      const valuePerRedemption = shop?.stampValue != null ? tierStamps * shop.stampValue : null;
      return { rewardText: text, count, valuePerRedemption };
    }).sort((a, b) => b.count - a.count);

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
      stampValue: shop?.stampValue ?? null,
      rewardBreakdown,
      customers: customerRows.filter(Boolean).sort((a, b) => b!.stamps - a!.stamps) as NonNullable<typeof customerRows[0]>[],
    };
  },
});

export const getAppUsageStats = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const customers = await ctx.db.query("customers").collect();
    const memberships = await ctx.db.query("memberships").collect();
    return customers
      .map(c => {
        const mems = memberships.filter(m => m.customerId.toString() === c._id.toString());
        return {
          name: c.name,
          shopCount: mems.length,
          totalStamps: mems.reduce((s, m) => s + m.totalStampsEver, 0),
        };
      })
      .sort((a, b) => b.shopCount - a.shopCount || b.totalStamps - a.totalStamps);
  },
});

// ─── Inhaber-Queries ──────────────────────────────────────────────────────────

export const listCustomersForShop = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminToken, limit }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "mitarbeiter" });
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new ConvexError("Shop nicht gefunden");
    const isMitarbeiter = adminToken === shop.mitarbeiterToken;

    const q = ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc");
    const memberships = limit !== undefined ? await q.take(limit) : await q.collect();

    const results = await Promise.all(
      memberships.map(async (m) => {
        const customer = await ctx.db.get(m.customerId);
        if (!customer) return null;
        return {
          membership: m,
          customer: isMitarbeiter ? { ...customer, email: "" } : customer,
        };
      })
    );
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const adminRestoreCustomerStamps = mutation({
  args: { membershipId: v.id("memberships"), adminSecret: v.string(), stamps: v.number() },
  handler: async (ctx, { membershipId, adminSecret, stamps }) => {
    requireAdmin({ secret: adminSecret });
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new ConvexError("Membership not found");
    await ctx.db.patch(membershipId, { currentStamps: Math.max(0, stamps) });
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
