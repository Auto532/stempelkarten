// Hält die Abrechnung in der Affiliate-App synchron mit der Anzahl der
// Kunden eines Shops: Die Kundenzahl bestimmt die Preisstufe
// (Free / Starter / Business / Premium, siehe lib/pricing.ts).
// Gemeldet wird nur, wenn ein neuer Beitritt eine Stufengrenze überschreitet
// (spart einen HTTP-Aufruf pro Beitritt). Zusätzlich gleicht ein täglicher
// Cron alle Shops ab, damit z. B. gelöschte Karten nachgezogen werden.

import { internalAction, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { tierForCardCount } from "./lib/pricing";

// Abgerechnet wird pro KUNDE, nicht pro Karte: gezählt werden verschiedene
// E-Mail-Adressen. Hat jemand mehrere Karten (neues Handy, Browser gelöscht,
// privates Fenster), zählt er trotzdem nur einmal.
async function billableEmails(ctx: { db: QueryCtx["db"] }, shopId: Id<"shops">): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for await (const m of ctx.db.query("memberships").withIndex("by_shop", (q) => q.eq("shopId", shopId))) {
    const customer = await ctx.db.get(m.customerId);
    if (!customer) continue;
    counts.set(customer.email, (counts.get(customer.email) ?? 0) + 1);
  }
  return counts;
}

export async function countBillableCustomers(ctx: { db: QueryCtx["db"] }, shopId: Id<"shops">): Promise<number> {
  return (await billableEmails(ctx, shopId)).size;
}

// Nach jeder neu angelegten Kunden-Karte aufrufen (nach dem insert).
export async function afterMembershipCreated(ctx: MutationCtx, shopId: Id<"shops">, customerId: Id<"customers">): Promise<void> {
  const emails   = await billableEmails(ctx, shopId);
  const customer = await ctx.db.get(customerId);
  // Gab es die E-Mail schon (zweite Karte derselben Person), ändert sich nichts.
  if (!customer || (emails.get(customer.email) ?? 0) > 1) return;
  const count = emails.size;
  if (tierForCardCount(count) !== tierForCardCount(count - 1)) {
    await ctx.scheduler.runAfter(0, internal.billingSync.syncCardCount, { shopId });
  }
}

export const getCardCount = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) return null;
    return countBillableCustomers(ctx, shopId);
  },
});

export const listShopIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    return shops.map(s => s._id);
  },
});

async function postCardCount(shopId: Id<"shops">, cardCount: number): Promise<void> {
  const siteUrl = process.env.AFFILIATE_CONVEX_SITE_URL ?? "";
  const secret  = process.env.BRIDGE_SECRET ?? "";
  if (!siteUrl || !secret) return;

  await fetch(`${siteUrl}/sync-card-count`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ secret, loatycardShopId: shopId, cardCount }),
  })
    // Fehler nur protokollieren: der tägliche Abgleich (crons.ts) holt es nach.
    .then(res => { if (!res.ok) console.error(`[billingSync] HTTP ${res.status} für Shop ${shopId}`); })
    .catch(err => console.error(`[billingSync] Brücke nicht erreichbar für Shop ${shopId}`, err));
}

export const syncCardCount = internalAction({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const count = await ctx.runQuery(internal.billingSync.getCardCount, { shopId });
    if (count === null) return;
    await postCardCount(shopId, count);
  },
});

// Täglicher Abgleich aller Shops (crons.ts) + einmalig nach der Umstellung.
export const resyncAllCardCounts = internalAction({
  args: {},
  handler: async (ctx) => {
    const ids = await ctx.runQuery(internal.billingSync.listShopIds, {});
    for (const shopId of ids) {
      const count = await ctx.runQuery(internal.billingSync.getCardCount, { shopId });
      if (count !== null) await postCardCount(shopId, count);
    }
  },
});
