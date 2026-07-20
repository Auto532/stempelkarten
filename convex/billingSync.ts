// Hält die Abrechnung (contract.rewardCount in der Affiliate-App) synchron mit
// den echten Bonus-Stufen des Shops. Abgerechnet werden nur AKTIVE Zusatz-Stufen
// oberhalb der Basis-Belohnung und nur bei eingeschaltetem Bonusprogramm-Toggle;
// die Basis-Belohnung (stampsRequired/rewardText) ist immer kostenlos.
// Wird nach jeder Stufen-/Toggle-Änderung angestoßen, egal ob die Änderung vom
// Admin (zk7) oder vom Inhaber (Betriebs-Dashboard) kommt.

import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getBillableRewardCount = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) return null;
    if (!shop.bonusProgramEnabled) return 0;
    // Zusatz-Stufen = enabled und über der Basis-Stufe. Die Betriebs-Ansicht
    // speichert die Basis-Stufe mit in rewardTiers (stamps == stampsRequired),
    // deshalb zählt nur stamps > stampsRequired.
    return (shop.rewardTiers ?? []).filter(t => t.enabled && t.stamps > shop.stampsRequired).length;
  },
});

export const syncBonusBilling = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const count = await ctx.runQuery(internal.billingSync.getBillableRewardCount, { shopId });
    if (count === null) return;

    const siteUrl  = process.env.AFFILIATE_CONVEX_SITE_URL ?? "";
    const adminPin = process.env.ADMIN_PIN ?? "";
    if (!siteUrl || !adminPin) return;

    await fetch(`${siteUrl}/sync-reward-count`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ adminPin, loatycardShopId: shopId, rewardCount: count }),
    }).catch(() => {});
  },
});
