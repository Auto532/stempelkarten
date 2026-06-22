import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const checkPin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const expected = process.env.ADMIN_PIN;
    if (!expected) throw new Error("ADMIN_PIN nicht gesetzt");
    if (pin !== expected) throw new Error("Falscher PIN");
    return true;
  },
});

export const clearAllData = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    const expected = process.env.ADMIN_PIN;
    if (!expected) throw new Error("ADMIN_PIN Umgebungsvariable nicht gesetzt");
    if (adminSecret !== expected) throw new Error("Nicht autorisiert");
    const tables = ["stampEvents", "memberships", "customers", "shops"] as const;
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    return "Alles gelöscht";
  },
});

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["stampEvents", "memberships", "customers", "shops"] as const;
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    return "Alles gelöscht";
  },
});

export const runMigrateMitarbeiterToken = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }): Promise<string> => {
    const expected = process.env.ADMIN_PIN;
    if (!expected) throw new Error("ADMIN_PIN nicht gesetzt");
    if (adminSecret !== expected) throw new Error("Nicht autorisiert");
    return await ctx.runMutation(internal.shops.migrateMitarbeiterToken, {});
  },
});
