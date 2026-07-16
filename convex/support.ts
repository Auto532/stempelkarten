import { mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
    const inhaberShop = await ctx.db
      .query("shops")
      .withIndex("by_adminLoginToken", q => q.eq("adminLoginToken", args.token))
      .unique();
    const mitarbeiterShop = inhaberShop ? null : await ctx.db
      .query("shops")
      .withIndex("by_mitarbeiterToken", q => q.eq("mitarbeiterToken", args.token))
      .unique();
    const shop = inhaberShop ?? mitarbeiterShop;
    if (!shop) throw new Error("Nicht eingeloggt");
    const senderRole = inhaberShop ? "inhaber" as const : "mitarbeiter" as const;

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
