import { v, ConvexError } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, requireShopRole } from "./auth";

// Spam-Schutz: Feedback erst ab Level 2 (10 Stempel in diesem Laden) und
// höchstens eine Nachricht pro Karte und Woche.
export const MSG_MIN_STAMPS = 10;
export const MSG_COOLDOWN_MS = 7 * 24 * 60 * 60_000;

// Für die Seite "Mein Bereich": darf der Kunde schreiben und ab wann wieder?
export const getFeedbackStatus = query({
  args: { qrToken: v.string(), membershipId: v.id("memberships") },
  handler: async (ctx, { qrToken, membershipId }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken))
      .unique();
    const membership = await ctx.db.get(membershipId);
    if (!customer || !membership || membership.customerId !== customer._id) return null;

    const last = await ctx.db
      .query("messages")
      .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
      .order("desc")
      .first();
    return {
      minStamps: MSG_MIN_STAMPS,
      nextAllowedAt: last ? last.createdAt + MSG_COOLDOWN_MS : null,
    };
  },
});

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

    if (membership.totalStampsEver < MSG_MIN_STAMPS) {
      throw new ConvexError(`Feedback ist ab ${MSG_MIN_STAMPS} Stempeln möglich.`);
    }

    // Eine Nachricht pro Woche und Karte
    const now = Date.now();
    const last = await ctx.db
      .query("messages")
      .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
      .order("desc")
      .first();
    if (last && now - last.createdAt < MSG_COOLDOWN_MS) {
      throw new ConvexError("Du kannst nur eine Nachricht pro Woche senden.");
    }

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

// Inhaber: Endkunden-Nachrichten lesen. role "inhaber" schließt den
// Mitarbeiter-Token bewusst aus, Mitarbeiter sollen die Nachrichten nicht sehen.
export const getMessagesForOwner = query({
  args: { shopId: v.id("shops"), adminToken: v.string() },
  handler: async (ctx, { shopId, adminToken }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(100);
    return await Promise.all(
      msgs.map(async (m) => {
        const customer = await ctx.db.get(m.customerId);
        return {
          _id: m._id, text: m.text, read: m.read, createdAt: m.createdAt,
          customerName: customer?.name ?? "Unbekannt",
        };
      })
    );
  },
});

export const markMessagesReadByOwner = mutation({
  args: { shopId: v.id("shops"), adminToken: v.string() },
  handler: async (ctx, { shopId, adminToken }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(200);
    await Promise.all(
      msgs.filter((m) => !m.read).map((m) => ctx.db.patch(m._id, { read: true }))
    );
  },
});

export const getMessagesForShop = query({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(200);
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
    await requireAdmin(ctx, { secret: adminSecret });
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
    await Promise.all(
      msgs.filter((m) => !m.read).map((m) => ctx.db.patch(m._id, { read: true }))
    );
  },
});
