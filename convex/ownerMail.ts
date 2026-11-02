// Willkommens-Mail für Shops ohne Abrechnung. Die Stempelkarten-App hat
// keinen eigenen Mail-Versand; sie bittet die Partner-App über die Brücke
// /send-shop-welcome darum (BRIDGE_SECRET). Fehlschlag = nur Log, der Shop
// ist trotzdem angelegt.

import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const markWelcomeSent = internalMutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    if (await ctx.db.get(shopId)) await ctx.db.patch(shopId, { welcomeSentAt: Date.now() });
  },
});

export const sendShopWelcome = internalAction({
  args: {
    shopId:          v.id("shops"),
    ownerEmail:      v.string(),
    ownerName:       v.string(),
    shopName:        v.string(),
    adminLoginToken: v.string(),
    slug:            v.string(),
  },
  handler: async (ctx, args) => {
    const siteUrl = process.env.AFFILIATE_CONVEX_SITE_URL ?? "";
    const secret  = process.env.BRIDGE_SECRET ?? "";
    const appUrl  = process.env.STEMPELKARTEN_APP_URL ?? "https://app.loyaltycard.info";
    if (!siteUrl || !secret) { console.error("[ownerMail] Brücke nicht konfiguriert"); return; }

    const res = await fetch(`${siteUrl}/send-shop-welcome`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        secret,
        ownerEmail: args.ownerEmail,
        ownerName:  args.ownerName,
        shopName:   args.shopName,
        loginUrl:   `${appUrl}/betrieb/login/${args.adminLoginToken}`,
        joinUrl:    `${appUrl}/join/${args.slug}`,
      }),
    }).catch(() => null);
    if (!res || !res.ok) {
      console.error(`[ownerMail] Willkommens-Mail fehlgeschlagen (${res ? res.status : "nicht erreichbar"})`);
      return;
    }
    await ctx.runMutation(internal.ownerMail.markWelcomeSent, { shopId: args.shopId });
  },
});
