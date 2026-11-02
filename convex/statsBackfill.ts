// Statistik-Zähler (lib/stats.ts) aus den vorhandenen Daten komplett neu
// aufbauen. Kann gefahrlos mehrfach laufen (setzt die Zähler jedes Mal neu).
//   npx convex run statsBackfill:backfillAll        (Test-Datenbank)
//   npx convex run --prod statsBackfill:backfillAll (Live, einmalig nach dem Deploy)
// Hinweis: Während des Laufs neu hinzukommende Stempel können doppelt bzw.
// gar nicht gezählt werden → in einer ruhigen Zeit ausführen.

import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { dayStart, shardOf } from "./lib/stats";
import type { Id } from "./_generated/dataModel";

export const shopIds = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("shops").collect()).map((s) => s._id),
});

// Eine Seite Stempel bzw. Karten EINES Ladens zählen (nur lesen)
export const countShopPage = internalQuery({
  args: { shopId: v.id("shops"), table: v.union(v.literal("stampEvents"), v.literal("memberships")), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { shopId, table, cursor }) => {
    if (table === "stampEvents") {
      const page = await ctx.db.query("stampEvents").withIndex("by_shop", (q) => q.eq("shopId", shopId)).paginate({ numItems: 5000, cursor });
      let stamps = 0, rewards = 0, last = 0;
      for (const e of page.page) {
        if (e.type === "stamp") stamps++; else rewards++;
        last = Math.max(last, e.timestamp);
      }
      return { stamps, rewards, customers: 0, last, cursor: page.continueCursor, done: page.isDone };
    }
    const page = await ctx.db.query("memberships").withIndex("by_shop", (q) => q.eq("shopId", shopId)).paginate({ numItems: 5000, cursor });
    return { stamps: 0, rewards: 0, customers: page.page.length, last: 0, cursor: page.continueCursor, done: page.isDone };
  },
});

export const writeShopStats = internalMutation({
  args: { shopId: v.id("shops"), customers: v.number(), stamps: v.number(), rewards: v.number(), last: v.number() },
  handler: async (ctx, { shopId, customers, stamps, rewards, last }) => {
    const row = await ctx.db.query("shopStats").withIndex("by_shop", (q) => q.eq("shopId", shopId)).unique();
    const data = { customers, stamps, rewards, ...(last ? { lastActivity: last } : {}) };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("shopStats", { shopId, ...data });
  },
});

// Kunden zählen + shopCount je Kunde neu berechnen (seitenweise)
export const customerPage = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("customers").paginate({ numItems: 100, cursor });
    for (const c of page.page) {
      const n = (await ctx.db.query("memberships").withIndex("by_customer", (q) => q.eq("customerId", c._id)).take(500)).length;
      if (c.shopCount !== n) await ctx.db.patch(c._id, { shopCount: n });
    }
    return { count: page.page.length, cursor: page.continueCursor, done: page.isDone };
  },
});

export const writeAppCounter = internalMutation({
  args: { key: v.string(), value: v.number() },
  handler: async (ctx, { key, value }) => {
    const row = await ctx.db.query("appCounters").withIndex("by_key", (q) => q.eq("key", key)).unique();
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("appCounters", { key, value });
  },
});

// Rohdaten für die Tagessummen seitenweise lesen
export const dailySourcePage = internalQuery({
  args: { table: v.union(v.literal("stampEvents"), v.literal("memberships")), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { table, cursor }) => {
    const page = await ctx.db.query(table).paginate({ numItems: 4000, cursor });
    const rows = page.page.map((d) => table === "stampEvents"
      ? { shopId: (d as { shopId: Id<"shops"> }).shopId, ts: (d as { timestamp: number }).timestamp, kind: (d as { type: string }).type }
      : { shopId: (d as { shopId: Id<"shops"> }).shopId, ts: d._creationTime, kind: "new" });
    return { rows, cursor: page.continueCursor, done: page.isDone };
  },
});

export const clearDailyPage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dailyTotals").take(2000);
    for (const r of rows) await ctx.db.delete(r._id);
    return { done: rows.length < 2000 };
  },
});

export const writeDaily = internalMutation({
  args: { rows: v.array(v.object({ day: v.number(), shard: v.number(), stamps: v.number(), redeems: v.number(), newCustomers: v.number() })) },
  handler: async (ctx, { rows }) => {
    for (const r of rows) {
      // Falls inzwischen schon eine Zeile entstanden ist: zusammenführen statt doppelt anlegen
      const existing = await ctx.db.query("dailyTotals")
        .withIndex("by_day_and_shard", (q) => q.eq("day", r.day).eq("shard", r.shard)).first();
      if (existing) await ctx.db.patch(existing._id, {
        stamps: existing.stamps + r.stamps, redeems: existing.redeems + r.redeems, newCustomers: existing.newCustomers + r.newCustomers,
      });
      else await ctx.db.insert("dailyTotals", r);
    }
  },
});

export const backfillAll = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    // 1) Zählerzeile je Laden (8 Läden parallel, nur lesen + eine Zeile schreiben)
    const ids = await ctx.runQuery(internal.statsBackfill.shopIds, {});
    for (let i = 0; i < ids.length; i += 8) {
      await Promise.all(ids.slice(i, i + 8).map(async (shopId) => {
        const t = { customers: 0, stamps: 0, rewards: 0, last: 0 };
        for (const table of ["stampEvents", "memberships"] as const) {
          let cursor: string | null = null, done = false;
          while (!done) {
            const r: { customers: number; stamps: number; rewards: number; last: number; cursor: string; done: boolean } =
              await ctx.runQuery(internal.statsBackfill.countShopPage, { shopId, table, cursor });
            t.customers += r.customers; t.stamps += r.stamps; t.rewards += r.rewards; t.last = Math.max(t.last, r.last);
            cursor = r.cursor; done = r.done;
          }
        }
        await ctx.runMutation(internal.statsBackfill.writeShopStats, { shopId, ...t });
      }));
    }
    console.log(`[backfill] Läden fertig (${ids.length})`);

    // 2) Kunden gesamt + Läden je Kunde
    let customers = 0;
    {
      let cursor: string | null = null, done = false;
      while (!done) {
        const r: { count: number; cursor: string; done: boolean } = await ctx.runMutation(internal.statsBackfill.customerPage, { cursor });
        customers += r.count; cursor = r.cursor; done = r.done;
      }
    }
    await ctx.runMutation(internal.statsBackfill.writeAppCounter, { key: "customers", value: customers });
    console.log(`[backfill] Kunden fertig (${customers})`);

    // 3) Tagessummen komplett neu aufbauen
    while (!(await ctx.runMutation(internal.statsBackfill.clearDailyPage, {})).done) { /* weiter löschen */ }
    const totals = new Map<string, { day: number; shard: number; stamps: number; redeems: number; newCustomers: number }>();
    for (const table of ["stampEvents", "memberships"] as const) {
      let cursor: string | null = null, done = false;
      while (!done) {
        const page: { rows: { shopId: Id<"shops">; ts: number; kind: string }[]; cursor: string; done: boolean } =
          await ctx.runQuery(internal.statsBackfill.dailySourcePage, { table, cursor });
        for (const r of page.rows) {
          const day = dayStart(r.ts), shard = shardOf(r.shopId), key = `${day}:${shard}`;
          const t = totals.get(key) ?? { day, shard, stamps: 0, redeems: 0, newCustomers: 0 };
          if (r.kind === "stamp") t.stamps++; else if (r.kind === "redeem") t.redeems++; else t.newCustomers++;
          totals.set(key, t);
        }
        cursor = page.cursor; done = page.done;
      }
    }
    const all = Array.from(totals.values());
    for (let i = 0; i < all.length; i += 500) {
      await ctx.runMutation(internal.statsBackfill.writeDaily, { rows: all.slice(i, i + 500) });
    }
    console.log(`[backfill] FERTIG: ${all.length} Tagessummen-Zeilen`);
    return `Fertig: ${ids.length} Läden, ${customers} Kunden, ${all.length} Tagessummen-Zeilen`;
  },
});
