import { v, ConvexError } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
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
    if (!customer) throw new ConvexError("Nicht autorisiert");

    const membership = await ctx.db.get(membershipId);
    if (!membership || membership.customerId !== customer._id) throw new ConvexError("Nicht autorisiert");

    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 1000) throw new ConvexError("Ungültige Nachricht");

    await ctx.db.insert("messages", {
      shopId: membership.shopId,
      membershipId,
      customerId: customer._id,
      text: trimmed,
      read: false,
      createdAt: Date.now(),
    });

    const shop = await ctx.db.get(membership.shopId);
    await ctx.scheduler.runAfter(0, internal.messages.notifyFeedbackTelegram, {
      shopName: shop?.name ?? "Unbekannter Shop",
      customerName: customer.name,
      text: trimmed,
    });
  },
});

// User-Input escapen — sonst kann eingeschleustes HTML die Telegram-Nachricht
// fälschen oder den Versand scheitern lassen (parse_mode: "HTML").
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Endkunden-Feedback an den eigenen Feedback-Bot (getrennt von Support/Leads).
// Env (Convex): FEEDBACK_TELEGRAM_BOT_TOKEN + FEEDBACK_TELEGRAM_CHAT_ID.
export const notifyFeedbackTelegram = internalAction({
  args: { shopName: v.string(), customerName: v.string(), text: v.string() },
  handler: async (_ctx, args) => {
    const token  = process.env.FEEDBACK_TELEGRAM_BOT_TOKEN ?? "";
    const chatId = process.env.FEEDBACK_TELEGRAM_CHAT_ID ?? "";
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, parse_mode: "HTML",
        text: `💬 <b>Kunden-Feedback</b>\n\n🏪 <b>Shop:</b> ${escapeHtml(args.shopName)}` +
          `\n👤 <b>Von:</b> ${escapeHtml(args.customerName)}` +
          `\n\n💬 ${escapeHtml(args.text)}`,
      }),
    }).catch(() => {});
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
