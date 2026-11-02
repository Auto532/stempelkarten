import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Leichter Health-Ping: die App misst damit die Antwortzeit des Backends.
// Bewusst ohne DB-Zugriff, damit er billig und schnell ist.
export const ping = query({
  args: {},
  handler: async () => ({ now: Date.now() }),
});

// Kapazitäts-Überblick fürs interne System-Monitoring im Admin.
export const getSystemHealth = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    // Aus den Zählern statt alle Kunden/Karten zu laden (skaliert auf 1.000+ Läden)
    const [shops, stats, customers] = await Promise.all([
      ctx.db.query("shops").collect(),
      ctx.db.query("shopStats").collect(),
      ctx.db.query("appCounters").withIndex("by_key", (q) => q.eq("key", "customers")).unique(),
    ]);
    const latest = await ctx.db.query("stampEvents").withIndex("by_timestamp").order("desc").first();
    return {
      now: Date.now(),
      counts: {
        shops: shops.length,
        customers: customers?.value ?? 0,
        memberships: stats.reduce((sum, st) => sum + st.customers, 0),
        stampEvents: stats.reduce((sum, st) => sum + st.stamps + st.rewards, 0),
      },
      lastActivity: latest?.timestamp ?? null,
    };
  },
});
