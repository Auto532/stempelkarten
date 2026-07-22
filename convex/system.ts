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
// stampEvents wird NICHT gezählt (große Tabelle), sondern aus den
// Mitgliedschaften abgeleitet: jede Aktion (Stempel/Einlösung) ist genau eine
// Zeile, also = Summe aus totalStampsEver + rewardsRedeemed.
export const getSystemHealth = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const shops = await ctx.db.query("shops").collect();
    const customers = await ctx.db.query("customers").collect();
    const memberships = await ctx.db.query("memberships").collect();
    const stampEvents = memberships.reduce((s, m) => s + m.totalStampsEver + m.rewardsRedeemed, 0);
    const latest = await ctx.db.query("stampEvents").withIndex("by_timestamp").order("desc").first();
    return {
      now: Date.now(),
      counts: {
        shops: shops.length,
        customers: customers.length,
        memberships: memberships.length,
        stampEvents,
      },
      lastActivity: latest?.timestamp ?? null,
    };
  },
});
