import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { assertNotLocked, recordFailure, clearFailures, timingSafeEqual } from "./rateLimit";
import { ADMIN_SESSION_MS, newSessionToken, requireAdmin } from "./auth";
import { insertCustomer, clearAllStats } from "./lib/stats";

export const checkPin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const expected = process.env.ADMIN_PIN;
    if (!expected) throw new ConvexError("ADMIN_PIN nicht gesetzt");

    // Brute-Force-Schutz (C2): globaler Schlüssel, da es genau einen Admin-PIN gibt.
    // Fehler werden ZURÜCKGEGEBEN statt geworfen: ein throw rollt in Convex alle
    // Schreibvorgänge zurück, dann würde der Fehlversuch nie gezählt.
    let throttle;
    try {
      throttle = await assertNotLocked(ctx, "admin-pin");
    } catch (err) {
      return { ok: false as const, error: err instanceof ConvexError ? String(err.data) : "Gesperrt" };
    }
    if (!timingSafeEqual(pin, expected)) {
      await recordFailure(ctx, "admin-pin", throttle);
      return { ok: false as const, error: "Falscher PIN" };
    }
    await clearFailures(ctx, throttle);

    // Abgelaufene Sitzungen nebenbei aufräumen (begrenzt)
    const now = Date.now();
    const expired = await ctx.db.query("adminSessions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(50);
    for (const s of expired) await ctx.db.delete(s._id);

    const token = newSessionToken();
    await ctx.db.insert("adminSessions", { token, createdAt: now, expiresAt: now + ADMIN_SESSION_MS });
    return { ok: true as const, token };
  },
});

// Für das Auto-Login nach Neuladen: ist der gespeicherte Schlüssel noch gültig?
export const isAdminSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return false;
    const session = await ctx.db.query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    return !!session && session.expiresAt > Date.now();
  },
});

export const logoutAdmin = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db.query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

// Alles-Löschen braucht eine gültige Sitzung UND den PIN erneut (Fehlklick-Schutz).
async function requireAdminWithPin(ctx: MutationCtx, adminSecret: string, pin: string) {
  await requireAdmin(ctx, { secret: adminSecret });
  const expected = process.env.ADMIN_PIN;
  if (!expected || !timingSafeEqual(pin, expected)) throw new ConvexError("Falscher PIN");
}

export const clearAllData = mutation({
  args: { adminSecret: v.string(), pin: v.string() },
  handler: async (ctx, { adminSecret, pin }) => {
    await requireAdminWithPin(ctx, adminSecret, pin);
    // Statistik-Zähler mit leeren
    await clearAllStats(ctx);
    const tables = ["stampEvents", "memberships", "customers", "messages", "shops", "owners"] as const;
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    return "Alles gelöscht";
  },
});

export const adminCreateTestCustomer = mutation({
  args: { adminSecret: v.string(), qrToken: v.string(), name: v.string() },
  handler: async (ctx, { adminSecret, qrToken, name }) => {
    await requireAdmin(ctx, { secret: adminSecret });

    const existing = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (existing) return { qrToken: existing.qrToken, created: false };

    await insertCustomer(ctx, { name, email: "", qrToken, createdAt: Date.now() });
    return { qrToken, created: true };
  },
});

export const clearCustomerData = mutation({
  args: { adminSecret: v.string(), pin: v.string() },
  handler: async (ctx, { adminSecret, pin }) => {
    await requireAdminWithPin(ctx, adminSecret, pin);
    await clearAllStats(ctx);
    const tables = ["stampEvents", "memberships", "customers"] as const;
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    return "Kundendaten gelöscht";
  },
});

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Statistik-Zähler mit leeren
    await clearAllStats(ctx);
    const tables = ["stampEvents", "memberships", "customers", "messages", "shops", "owners"] as const;
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    return "Alles gelöscht";
  },
});
