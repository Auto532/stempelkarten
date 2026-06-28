import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

export const sendMessage = mutation({
  args: {
    qrToken: v.string(),
    membershipId: v.id("memberships"),
    text: v.string(),
  },
  handler: async (ctx, { qrToken, membershipId, text }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    if (!customer) throw new Error("Nicht autorisiert");

    const membership = await ctx.db.get(membershipId);
    if (!membership || membership.customerId !== customer._id) throw new Error("Nicht autorisiert");

    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 1000) throw new Error("Ungültige Nachricht");

    await ctx.db.insert("messages", {
      shopId: membership.shopId,
      membershipId,
      customerId: customer._id,
      text: trimmed,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const getMessagesForShop = query({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .collect();
    return await Promise.all(
      msgs.map(async (m) => {
        const customer = await ctx.db.get(m.customerId);
        return { ...m, customerName: customer?.name ?? "Unbekannt" };
      })
    );
  },
});

export const markMessagesRead = mutation({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
    await Promise.all(
      msgs.filter((m) => !m.read).map((m) => ctx.db.patch(m._id, { read: true }))
    );
  },
});
