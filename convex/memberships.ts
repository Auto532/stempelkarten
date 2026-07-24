import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireShopRole, requireAdmin } from "./auth";
import type { Id } from "./_generated/dataModel";

// Fortlaufende Kunden-Nummer pro Shop (#1, #2, …). Basis ist das Maximum der
// vergebenen Nummern (nicht die Anzahl), damit Nummern gelöschter Kunden nie
// neu vergeben werden.
export async function nextMemberNumber(
  ctx: { db: { query: (t: "memberships") => any } },
  shopId: Id<"shops">,
): Promise<number> {
  const mems = await ctx.db.query("memberships")
    .withIndex("by_shop", (q: any) => q.eq("shopId", shopId))
    .collect();
  return mems.reduce((max: number, m: any) => Math.max(max, m.memberNumber ?? 0), mems.length) + 1;
}

// Einmaliger Backfill für Bestandskunden: nummeriert pro Shop in
// Beitritts-Reihenfolge (_creationTime), vorhandene Nummern bleiben.
export const backfillMemberNumbers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    let updated = 0;
    for (const shop of shops) {
      const mems = (await ctx.db.query("memberships")
        .withIndex("by_shop", q => q.eq("shopId", shop._id))
        .collect()).sort((a, b) => a._creationTime - b._creationTime);
      let next = mems.reduce((max, m) => Math.max(max, m.memberNumber ?? 0), 0);
      for (const m of mems) {
        if (m.memberNumber === undefined) {
          next += 1;
          await ctx.db.patch(m._id, { memberNumber: next });
          updated++;
        }
      }
    }
    return { updated };
  },
});

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
    if (!customer) throw new ConvexError("Kunde nicht gefunden");

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
      memberNumber: await nextMemberNumber(ctx, shopId),
      currentStamps: 0,
      totalStampsEver: 0,
      rewardsRedeemed: 0,
      acquisitionType,
      consentedAt: Date.now(),
    });
  },
});

// Missbrauch-Schutz: mehrere Stempel pro Besuch sind legitim (z.B. 30 € = 3
// Stempel), daher KEINE Zeitsperre pro Stempel. Nur bei auffällig vielen
// Stempeln auf derselben Karte in kurzer Zeit wird geblockt.
const STAMP_BURST_WINDOW_MS = 60_000; // 1 Minute
const STAMP_BURST_MAX = 10;           // legit sind ~5/Besuch, ab 10 in 60s = Missbrauch

export const addStamp = mutation({
  args: { membershipId: v.id("memberships"), adminToken: v.string() },
  handler: async (ctx, { membershipId, adminToken }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new ConvexError("Mitgliedschaft nicht gefunden");

    const shop = await requireShopRole(ctx, { shopId: membership.shopId, token: adminToken, role: "mitarbeiter" });
    if (shop.active === false) throw new ConvexError("Shop ist deaktiviert, Stempeln nicht möglich");

    // Missbrauch-Limit: die letzten Events dieser Karte prüfen (begrenzte Abfrage)
    const since = Date.now() - STAMP_BURST_WINDOW_MS;
    const recentEvents = await ctx.db
      .query("stampEvents")
      .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
      .order("desc")
      .take(STAMP_BURST_MAX + 5);
    const burstCount = recentEvents.filter((e) => e.type === "stamp" && e.timestamp >= since).length;
    if (burstCount >= STAMP_BURST_MAX) {
      throw new ConvexError("Zu viele Stempel in kurzer Zeit. Bitte kontaktieren Sie den Support.");
    }

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
    if (!membership) throw new ConvexError("Mitgliedschaft nicht gefunden");

    const shop = await requireShopRole(ctx, { shopId: membership.shopId, token: adminToken, role: "mitarbeiter" });

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

export const adminStampForCustomer = mutation({
  args: { adminSecret: v.string(), shopId: v.id("shops"), qrToken: v.string() },
  handler: async (ctx, { adminSecret, shopId, qrToken }) => {
    requireAdmin({ secret: adminSecret });

    let customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();

    if (!customer) {
      const id = await ctx.db.insert("customers", {
        name: "Test-Kunde",
        email: "",
        qrToken,
        createdAt: Date.now(),
      });
      customer = await ctx.db.get(id);
    }
    if (!customer) throw new ConvexError("Kunde konnte nicht erstellt werden");

    const shop = await ctx.db.get(shopId);
    if (!shop) throw new ConvexError("Shop nicht gefunden");

    let membership = await ctx.db
      .query("memberships")
      .withIndex("by_customer_and_shop", (q) =>
        q.eq("customerId", customer._id).eq("shopId", shopId)
      )
      .unique();

    if (!membership) {
      const mId = await ctx.db.insert("memberships", {
        customerId: customer._id,
        shopId,
        memberNumber: await nextMemberNumber(ctx, shopId),
        currentStamps: 0,
        totalStampsEver: 0,
        rewardsRedeemed: 0,
        consentedAt: Date.now(),
      });
      membership = await ctx.db.get(mId);
    }
    if (!membership) throw new ConvexError("Mitgliedschaft konnte nicht erstellt werden");

    const newStamps = membership.currentStamps + 1;
    const rewardReached = newStamps >= shop.stampsRequired;

    await ctx.db.patch(membership._id, {
      currentStamps: newStamps,
      totalStampsEver: membership.totalStampsEver + 1,
      lastStampAt: Date.now(),
    });

    await ctx.db.insert("stampEvents", {
      membershipId: membership._id,
      shopId,
      type: "stamp",
      timestamp: Date.now(),
    });

    return { rewardReached, stampsRequired: shop.stampsRequired, currentStamps: newStamps, customerName: customer.name };
  },
});

export const setPendingRedemption = mutation({
  args: { qrToken: v.string(), membershipId: v.id("memberships"), targetStamps: v.number() },
  handler: async (ctx, { qrToken, membershipId, targetStamps }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (!customer) throw new ConvexError("Kunde nicht gefunden");

    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new ConvexError("Mitgliedschaft nicht gefunden");
    if (membership.customerId !== customer._id) throw new ConvexError("Nicht berechtigt");

    const shop = await ctx.db.get(membership.shopId);
    if (!shop) throw new ConvexError("Shop nicht gefunden");

    const activeTiers = (shop.bonusProgramEnabled ? (shop.rewardTiers ?? []) : [])
      .filter((t) => t.enabled)
      .sort((a, b) => a.stamps - b.stamps);
    const baseTier = { stamps: shop.stampsRequired, text: shop.rewardText };
    const tiers = activeTiers.length > 0
      ? [baseTier, ...activeTiers].sort((a, b) => a.stamps - b.stamps)
      : [baseTier];
    const tier = tiers.find((t) => t.stamps === targetStamps && membership.currentStamps >= t.stamps);
    if (!tier) throw new ConvexError("Keine Belohnung verfügbar");

    await ctx.db.patch(membershipId, { pendingRedemption: { stamps: tier.stamps, rewardText: tier.text } });
    return { rewardText: tier.text };
  },
});

export const cancelPendingRedemption = mutation({
  args: { qrToken: v.string(), membershipId: v.id("memberships") },
  handler: async (ctx, { qrToken, membershipId }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (!customer) throw new ConvexError("Kunde nicht gefunden");
    const membership = await ctx.db.get(membershipId);
    if (!membership || membership.customerId !== customer._id) throw new ConvexError("Nicht berechtigt");
    await ctx.db.patch(membershipId, { pendingRedemption: undefined });
  },
});

export const confirmPendingRedemption = mutation({
  args: { membershipId: v.id("memberships"), adminToken: v.string() },
  handler: async (ctx, { membershipId, adminToken }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new ConvexError("Mitgliedschaft nicht gefunden");

    await requireShopRole(ctx, { shopId: membership.shopId, token: adminToken, role: "mitarbeiter" });

    const pending = membership.pendingRedemption;
    if (!pending) throw new ConvexError("Keine ausstehende Einlösung");
    if (membership.currentStamps < pending.stamps) throw new ConvexError("Nicht genug Stempel");

    const carryOver = Math.max(0, membership.currentStamps - pending.stamps);
    await ctx.db.patch(membershipId, {
      currentStamps: carryOver,
      rewardsRedeemed: membership.rewardsRedeemed + 1,
      pendingRedemption: undefined,
    });
    await ctx.db.insert("stampEvents", {
      membershipId,
      shopId: membership.shopId,
      type: "redeem",
      rewardText: pending.rewardText,
      timestamp: Date.now(),
    });
    return { rewardText: pending.rewardText };
  },
});

export const adminConfirmPendingRedemption = mutation({
  args: { membershipId: v.id("memberships"), adminSecret: v.string() },
  handler: async (ctx, { membershipId, adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new ConvexError("Mitgliedschaft nicht gefunden");
    const pending = membership.pendingRedemption;
    if (!pending) throw new ConvexError("Keine ausstehende Einlösung");
    if (membership.currentStamps < pending.stamps) throw new ConvexError("Nicht genug Stempel");
    const carryOver = Math.max(0, membership.currentStamps - pending.stamps);
    await ctx.db.patch(membershipId, {
      currentStamps: carryOver,
      rewardsRedeemed: membership.rewardsRedeemed + 1,
      pendingRedemption: undefined,
    });
    await ctx.db.insert("stampEvents", {
      membershipId,
      shopId: membership.shopId,
      type: "redeem",
      rewardText: pending.rewardText,
      timestamp: Date.now(),
    });
    return { rewardText: pending.rewardText };
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
