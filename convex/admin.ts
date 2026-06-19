import { internalMutation } from "./_generated/server";

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
