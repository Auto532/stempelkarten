import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./auth";
import type { QueryCtx } from "./_generated/server";

// Shop zum Login-Token auflösen (Inhaber- oder Mitarbeiter-Token)
async function shopFromToken(ctx: QueryCtx, token: string) {
  const inhaberShop = await ctx.db
    .query("shops")
    .withIndex("by_adminLoginToken", q => q.eq("adminLoginToken", token))
    .unique();
  if (inhaberShop) return { shop: inhaberShop, role: "inhaber" as const };
  const mitarbeiterShop = await ctx.db
    .query("shops")
    .withIndex("by_mitarbeiterToken", q => q.eq("mitarbeiterToken", token))
    .unique();
  if (mitarbeiterShop) return { shop: mitarbeiterShop, role: "mitarbeiter" as const };
  return null;
}

// Support-Anfrage vom Betrieb (Inhaber/Mitarbeiter, auth via Login-Token).
// Wird gespeichert + per Telegram an den Admin geschickt.
// Env (Convex): TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (derselbe Bot wie bei
// der Shop-Erstellung; SUPPORT_TELEGRAM_* kann später als Override gesetzt werden).

export const submitTicket = mutation({
  args: {
    token:   v.string(),
    message: v.string(),
    contact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await shopFromToken(ctx, args.token);
    if (!auth) throw new Error("Nicht eingeloggt");
    const { shop, role: senderRole } = auth;

    const message = args.message.trim();
    if (!message) throw new Error("Bitte beschreibe dein Anliegen");
    if (message.length > 2000) throw new Error("Nachricht zu lang (max. 2000 Zeichen)");

    await ctx.db.insert("supportTickets", {
      shopId: shop._id, senderRole, message,
      contact: args.contact?.trim() || undefined,
      status: "open", createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.support.notifySupportTelegram, {
      from:    `Betrieb: ${shop.name} (${senderRole === "inhaber" ? "Inhaber" : "Mitarbeiter"})`,
      message,
      contact: args.contact?.trim() || undefined,
    });
  },
});

// Eigene Anfragen des Betriebs (inkl. Status + Admin-Antwort)
export const listMyTickets = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const auth = await shopFromToken(ctx, args.token);
    if (!auth) return null;
    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_shop", q => q.eq("shopId", auth.shop._id))
      .collect();
    return tickets
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(t => ({ _id: t._id, message: t.message, status: t.status, reply: t.reply ?? null, repliedAt: t.repliedAt ?? null, createdAt: t.createdAt }));
  },
});

// ── Admin: Tickets verwalten ──────────────────────────────────────────────────

export const adminListTickets = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const tickets = await ctx.db.query("supportTickets").order("desc").collect();
    return Promise.all(tickets.map(async t => {
      const shop = await ctx.db.get(t.shopId);
      return { ...t, shopName: shop?.name ?? "(gelöschter Shop)" };
    }));
  },
});

export const adminAnswerTicket = mutation({
  args: {
    adminSecret: v.string(),
    ticketId:    v.id("supportTickets"),
    reply:       v.optional(v.string()),
    status:      v.union(v.literal("open"), v.literal("done")),
  },
  handler: async (ctx, { adminSecret, ticketId, reply, status }) => {
    requireAdmin({ secret: adminSecret });
    const patch: Record<string, unknown> = { status };
    const trimmed = reply?.trim();
    if (trimmed) { patch.reply = trimmed; patch.repliedAt = Date.now(); }
    await ctx.db.patch(ticketId, patch);
  },
});

export const notifySupportTelegram = internalAction({
  args: { from: v.string(), message: v.string(), contact: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const token  = process.env.SUPPORT_TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN ?? "";
    const chatId = process.env.SUPPORT_TELEGRAM_CHAT_ID  ?? process.env.TELEGRAM_CHAT_ID  ?? "";
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, parse_mode: "HTML",
        text: `🆘 <b>Support-Anfrage</b>\n\n👤 <b>Von:</b> ${args.from}` +
          (args.contact ? `\n📞 <b>Kontakt:</b> ${args.contact}` : "") +
          `\n\n💬 ${args.message}`,
      }),
    }).catch(() => {});
  },
});
