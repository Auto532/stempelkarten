import { internalMutation, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { assertNotLocked, recordFailure, clearFailures, timingSafeEqual } from "./rateLimit";

export const checkPin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const expected = process.env.ADMIN_PIN;
    if (!expected) throw new ConvexError("ADMIN_PIN nicht gesetzt");

    // Brute-Force-Schutz (C2): globaler Schlüssel, da es genau einen Admin-PIN gibt.
    const throttle = await assertNotLocked(ctx, "admin-pin");
    if (!timingSafeEqual(pin, expected)) {
      await recordFailure(ctx, "admin-pin", throttle);
      throw new ConvexError("Falscher PIN");
    }
    await clearFailures(ctx, throttle);
    return true;
  },
});

export const clearAllData = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    const expected = process.env.ADMIN_PIN;
    if (!expected) throw new ConvexError("ADMIN_PIN Umgebungsvariable nicht gesetzt");
    if (adminSecret !== expected) throw new ConvexError("Nicht autorisiert");
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
    const expected = process.env.ADMIN_PIN;
    if (!expected) throw new ConvexError("ADMIN_PIN nicht gesetzt");
    if (adminSecret !== expected) throw new ConvexError("Nicht autorisiert");

    const existing = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (existing) return { qrToken: existing.qrToken, created: false };

    await ctx.db.insert("customers", { name, email: "", qrToken, createdAt: Date.now() });
    return { qrToken, created: true };
  },
});

export const clearCustomerData = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    const expected = process.env.ADMIN_PIN;
    if (!expected) throw new ConvexError("ADMIN_PIN nicht gesetzt");
    if (adminSecret !== expected) throw new ConvexError("Nicht autorisiert");
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
