import { mutation, query, internalAction } from "./_generated/server";
import { v, ConvexError } from "convex/values";
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
    if (!auth) throw new ConvexError("Nicht eingeloggt");
    const { shop, role: senderRole } = auth;

    const message = args.message.trim();
    if (!message) throw new ConvexError("Bitte beschreibe dein Anliegen");
    if (message.length > 2000) throw new ConvexError("Nachricht zu lang (max. 2000 Zeichen)");

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

// Kompletter Verlauf: Erstnachricht + Legacy-Antwort + Thread, chronologisch
type ThreadMsg = { from: "user" | "admin"; text: string; at: number };
function buildThread(t: { message: string; createdAt: number; reply?: string; repliedAt?: number; thread?: ThreadMsg[] }): ThreadMsg[] {
  return [
    { from: "user", text: t.message, at: t.createdAt },
    ...(t.reply ? [{ from: "admin" as const, text: t.reply, at: t.repliedAt ?? t.createdAt }] : []),
    ...(t.thread ?? []),
  ];
}

// Fortlaufende Ticketnummern (#001 = ältestes Ticket, app-weit — Admin und
// Absender sehen dieselbe Nummer)
async function ticketNumbers(ctx: QueryCtx): Promise<Map<string, number>> {
  const all = await ctx.db.query("supportTickets").collect();
  all.sort((a, b) => a.createdAt - b.createdAt);
  return new Map(all.map((t, i) => [t._id as string, i + 1]));
}

// Eigene Anfragen des Betriebs (kompletter Verlauf + Status)
export const listMyTickets = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const auth = await shopFromToken(ctx, args.token);
    if (!auth) return null;
    const numbers = await ticketNumbers(ctx);
    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_shop", q => q.eq("shopId", auth.shop._id))
      .collect();
    return tickets
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(t => ({ _id: t._id, number: numbers.get(t._id as string) ?? 0, status: t.status, createdAt: t.createdAt, thread: buildThread(t) }));
  },
});

// Betrieb antwortet im Ticket (solange nicht geschlossen; Antwort auf
// geschlossenes Ticket öffnet es wieder)
export const replyTicket = mutation({
  args: { token: v.string(), ticketId: v.id("supportTickets"), message: v.string() },
  handler: async (ctx, args) => {
    const auth = await shopFromToken(ctx, args.token);
    if (!auth) throw new ConvexError("Nicht eingeloggt");
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.shopId !== auth.shop._id) throw new ConvexError("Ticket nicht gefunden");
    const message = args.message.trim();
    if (!message) throw new ConvexError("Nachricht ist leer");
    if (message.length > 2000) throw new ConvexError("Nachricht zu lang (max. 2000 Zeichen)");

    await ctx.db.patch(args.ticketId, {
      thread: [...(ticket.thread ?? []), { from: "user" as const, text: message, at: Date.now() }],
      status: "open",
    });

    await ctx.scheduler.runAfter(0, internal.support.notifySupportTelegram, {
      from:    `Betrieb: ${auth.shop.name}: neue Antwort im Ticket`,
      message,
    });
  },
});

// ── Admin: Tickets verwalten ──────────────────────────────────────────────────

export const adminListTickets = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    const numbers = await ticketNumbers(ctx);
    const tickets = await ctx.db.query("supportTickets").order("desc").collect();
    return Promise.all(tickets.map(async t => {
      const shop = await ctx.db.get(t.shopId);
      return {
        _id: t._id, number: numbers.get(t._id as string) ?? 0,
        senderRole: t.senderRole, contact: t.contact ?? null,
        status: t.status, createdAt: t.createdAt,
        shopName: shop?.name ?? "(gelöschter Shop)",
        thread: buildThread(t),
      };
    }));
  },
});

// Antwort anhängen (Ticket bleibt offen) und/oder Status setzen
export const adminAnswerTicket = mutation({
  args: {
    adminSecret: v.string(),
    ticketId:    v.id("supportTickets"),
    reply:       v.optional(v.string()),
    status:      v.optional(v.union(v.literal("open"), v.literal("done"))),
  },
  handler: async (ctx, { adminSecret, ticketId, reply, status }) => {
    requireAdmin({ secret: adminSecret });
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new ConvexError("Ticket nicht gefunden");
    const patch: Record<string, unknown> = {};
    const trimmed = reply?.trim();
    if (trimmed) {
      patch.thread = [...(ticket.thread ?? []), { from: "admin" as const, text: trimmed, at: Date.now() }];
    }
    if (status) patch.status = status;
    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(ticketId, patch);
  },
});

// User-Input escapen — sonst kann eingeschleustes HTML die Telegram-Nachricht
// fälschen oder den Versand scheitern lassen (parse_mode: "HTML").
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
        text: `🆘 <b>Support-Anfrage</b>\n\n👤 <b>Von:</b> ${escapeHtml(args.from)}` +
          (args.contact ? `\n📞 <b>Kontakt:</b> ${escapeHtml(args.contact)}` : "") +
          `\n\n💬 ${escapeHtml(args.message)}`,
      }),
    }).catch(() => {});
  },
});
