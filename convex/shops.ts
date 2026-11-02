import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin, requireShopRole, sanitizeShop } from "./auth";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { clearShopStats, deleteMembership, dayStart } from "./lib/stats";

// ─── Eingabe-Grenzen ─────────────────────────────────────────────────────────
// Schützt vor unsinnigen Werten (0 Stempel = Belohnung bei jedem Stempel) und
// riesigen Texten, egal ob die Änderung vom Inhaber oder vom Admin kommt.

type Tier = { stamps: number; text: string; enabled: boolean };

function checkInt(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new ConvexError(`${label} muss eine ganze Zahl von ${min} bis ${max} sein`);
}

function checkText(value: string | undefined, max: number, label: string) {
  if (value !== undefined && value.length > max)
    throw new ConvexError(`${label} ist zu lang (max. ${max} Zeichen)`);
}

function validateRewardSettings(a: { stampsRequired: number; rewardText: string; rewardTiers?: Tier[]; stampValue?: number }) {
  checkInt(a.stampsRequired, 1, 100, "Stempel bis zur Belohnung");
  if (!a.rewardText.trim()) throw new ConvexError("Bitte einen Belohnungstext angeben");
  checkText(a.rewardText, 200, "Belohnungstext");
  if (a.rewardTiers) {
    if (a.rewardTiers.length > 10) throw new ConvexError("Maximal 10 Bonus-Stufen");
    for (const t of a.rewardTiers) {
      checkInt(t.stamps, 1, 1000, "Stempel einer Bonus-Stufe");
      checkText(t.text, 200, "Text einer Bonus-Stufe");
    }
  }
  if (a.stampValue !== undefined && (!Number.isFinite(a.stampValue) || a.stampValue < 0 || a.stampValue > 1000))
    throw new ConvexError("Stempelwert muss zwischen 0 und 1000 liegen");
}

function validateMilestones(milestones: Tier[]) {
  if (milestones.length > 20) throw new ConvexError("Maximal 20 Meilensteine");
  for (const m of milestones) {
    checkInt(m.stamps, 1, 10000, "Stempel eines Meilensteins");
    checkText(m.text, 200, "Text eines Meilensteins");
  }
}

function validateLegalTexts(a: { impressumText?: string; agbText?: string; datenschutzText?: string }) {
  checkText(a.impressumText, 20000, "Impressum");
  checkText(a.agbText, 20000, "AGB");
  checkText(a.datenschutzText, 20000, "Datenschutzerklärung");
}

// Löscht alte Storage-Dateien sicher. Löscht nur IDs, die NICHT mehr in der
// neuen Konfiguration referenziert werden (keepIds), dedupliziert, ignoriert
// fehlende IDs und schluckt Fehler bewusst: eine nicht gelöschte Datei ist nur
// vorübergehend Datenmüll und darf einen bereits gespeicherten Bildwechsel nie
// rückgängig machen. Wird IMMER erst NACH erfolgreichem db.patch aufgerufen.
async function deleteReplacedStorageIds(
  ctx: MutationCtx,
  oldIds: (Id<"_storage"> | undefined)[],
  keepIds: (Id<"_storage"> | undefined)[],
): Promise<void> {
  const keep = keepIds.filter((x): x is Id<"_storage"> => !!x);
  const seen: Id<"_storage">[] = [];
  for (const id of oldIds) {
    if (!id) continue;                       // fehlende ID ignorieren
    if (keep.includes(id)) continue;         // noch referenziert → behalten
    if (seen.includes(id)) continue;         // dieselbe ID nur einmal löschen
    seen.push(id);
    try {
      await ctx.storage.delete(id);
    } catch {
      // bewusst ignorieren — Altdatei bleibt Datenmüll, Ablauf läuft weiter
    }
  }
}


export const provisionShopFromAffiliate = internalMutation({
  args: {
    shopName:        v.string(),
    affiliateLeadId: v.string(),
  },
  handler: async (ctx, args) => {
    const umlautMap: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
    const base = args.shopName.toLowerCase()
      .replace(/[äöüß]/g, c => umlautMap[c] ?? c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "shop";

    let slug = base;
    for (let i = 1; i < 100; i++) {
      const exists = await ctx.db.query("shops").withIndex("by_slug", q => q.eq("slug", slug)).unique();
      if (!exists) break;
      slug = `${base}-${i}`;
    }

    const adminLoginToken    = crypto.randomUUID();
    const mitarbeiterToken   = crypto.randomUUID();

    const shopId = await ctx.db.insert("shops", {
      name:            args.shopName,
      slug,
      stampsRequired:  10,
      rewardText:      "Gratis-Produkt nach 10 Stempeln",
      adminLoginToken,
      mitarbeiterToken,
      createdAt:       Date.now(),
    });

    return { shopId: shopId as string, slug, adminLoginToken };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!shop) return null;
    return sanitizeShop(shop);
  },
});


export const resolveLoginToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const inhaberShop = await ctx.db
      .query("shops")
      .withIndex("by_adminLoginToken", (q) => q.eq("adminLoginToken", token))
      .unique();
    if (inhaberShop) {
      return { role: "inhaber" as const, shopSlug: inhaberShop.slug };
    }
    const mitarbeiterShop = await ctx.db
      .query("shops")
      .withIndex("by_mitarbeiterToken", (q) => q.eq("mitarbeiterToken", token))
      .unique();
    if (mitarbeiterShop) {
      return { role: "mitarbeiter" as const, shopSlug: mitarbeiterShop.slug };
    }
    return null;
  },
});

export const getById = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shop = await ctx.db.get(shopId);
    if (!shop) return null;
    return sanitizeShop(shop);
  },
});

// ─── Inhaber-Mutations ────────────────────────────────────────────────────────

export const updateSettings = mutation({
  args: {
    shopId: v.id("shops"),
    adminToken: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
    rewardTiers: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    stampValue: v.optional(v.number()),
  },
  handler: async (ctx, { shopId, adminToken, stampsRequired, rewardText, rewardTiers, stampValue }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    validateRewardSettings({ stampsRequired, rewardText, rewardTiers, stampValue });
    await ctx.db.patch(shopId, { stampsRequired, rewardText, rewardTiers, stampValue });
  },
});

export const updateMilestones = mutation({
  args: {
    shopId: v.id("shops"),
    adminToken: v.string(),
    milestones: v.array(v.object({ stamps: v.number(), text: v.string(), enabled: v.boolean() })),
  },
  handler: async (ctx, { shopId, adminToken, milestones }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    validateMilestones(milestones);
    await ctx.db.patch(shopId, { milestones });
  },
});

export const updateLegalTexts = mutation({
  args: {
    shopId: v.id("shops"),
    inhaberToken: v.string(),
    impressumText: v.optional(v.string()),
    agbText: v.optional(v.string()),
    datenschutzText: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, inhaberToken, impressumText, agbText, datenschutzText }) => {
    await requireShopRole(ctx, { shopId, token: inhaberToken, role: "inhaber" });
    validateLegalTexts({ impressumText, agbText, datenschutzText });
    await ctx.db.patch(shopId, { impressumText, agbText, datenschutzText });
  },
});

export const updateShopConfig = mutation({
  args: {
    shopId: v.id("shops"),
    inhaberToken: v.string(),
    accentColor: v.optional(v.string()),
    stampIcon: v.optional(v.string()),
    theme: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, inhaberToken, accentColor, stampIcon, theme }) => {
    await requireShopRole(ctx, { shopId, token: inhaberToken, role: "inhaber" });
    checkText(accentColor, 50, "Akzentfarbe");
    checkText(stampIcon, 50, "Stempel-Symbol");
    checkText(theme, 50, "Theme");
    await ctx.db.patch(shopId, { accentColor, stampIcon, theme });
  },
});

export const updatePriceInfo = mutation({
  args: {
    shopId: v.id("shops"),
    adminSecret: v.string(),
    priceInfo: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, adminSecret, priceInfo }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    await ctx.db.patch(shopId, { priceInfo });
  },
});

// ─── Admin-Mutations (Freischalt-Flags) ──────────────────────────────────────

export const adminUpdateShopContent = mutation({
  args: {
    shopId: v.id("shops"),
    adminSecret: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
    rewardTiers: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    milestones: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    stampValue: v.optional(v.number()),
  },
  handler: async (ctx, { shopId, adminSecret, stampsRequired, rewardText, rewardTiers, milestones, stampValue }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    validateRewardSettings({ stampsRequired, rewardText, rewardTiers, stampValue });
    if (milestones) validateMilestones(milestones);
    await ctx.db.patch(shopId, { stampsRequired, rewardText, rewardTiers, milestones, stampValue });
  },
});

export const adminSetFeatures = mutation({
  args: {
    shopId: v.id("shops"),
    adminSecret: v.string(),
    showLeads: v.optional(v.boolean()),
    bonusProgramEnabled: v.optional(v.boolean()),
    milestonesEnabled: v.optional(v.boolean()),
    customDesignEnabled: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
    clearTheme: v.optional(v.boolean()),
    theme: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, adminSecret, ...flags }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const patch: Record<string, unknown> = {};
    if (flags.showLeads !== undefined) patch.showLeads = flags.showLeads;
    if (flags.bonusProgramEnabled !== undefined) patch.bonusProgramEnabled = flags.bonusProgramEnabled;
    if (flags.milestonesEnabled !== undefined) patch.milestonesEnabled = flags.milestonesEnabled;
    if (flags.customDesignEnabled !== undefined) patch.customDesignEnabled = flags.customDesignEnabled;
    if (flags.active !== undefined) patch.active = flags.active;
    if (flags.clearTheme) patch.theme = undefined;
    if (flags.theme !== undefined) patch.theme = flags.theme;
    if (flags.accentColor !== undefined) patch.accentColor = flags.accentColor;
    await ctx.db.patch(shopId, patch);
  },
});

// ── Config-Design (Admin-Editor) ──────────────────────────────────────────────

// Upload-URL für Logo/Hintergrundbild (Convex File Storage), admin-gated.
export const adminGenerateUploadUrl = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    return await ctx.storage.generateUploadUrl();
  },
});

// Speichert das Config-Design eines Shops. Bild-URLs werden hier serverseitig
// aus den Storage-IDs aufgelöst und mitgespeichert, damit die Kunden-Seiten
// keine extra Storage-Queries brauchen. config = null löscht das Design.
export const adminSetDesignConfig = mutation({
  args: {
    shopId:      v.id("shops"),
    adminSecret: v.string(),
    config: v.union(v.null(), v.object({
      accent:    v.string(),
      text:      v.string(),
      textBody:  v.string(),
      cardBg:    v.string(),
      bgType:    v.union(v.literal("color"), v.literal("gradient"), v.literal("image")),
      bgColor:   v.optional(v.string()),
      bgColor2:  v.optional(v.string()),
      bgImageId: v.optional(v.id("_storage")),
      logoId:    v.optional(v.id("_storage")),
      logoSize:  v.optional(v.union(v.literal("s"), v.literal("m"), v.literal("l"))),
      logoShowName: v.optional(v.boolean()),
      logoHeight: v.optional(v.number()),
      logoWidth: v.optional(v.number()),
      tagline:   v.optional(v.string()),
      qrStyle:   v.optional(v.union(v.literal("button"), v.literal("icon"), v.literal("both"))),
      stampIcon: v.optional(v.string()),
      stampShape: v.optional(v.string()),
      stampBorderColor: v.optional(v.string()),
      stampBorderStyle: v.optional(v.union(v.literal("thin"), v.literal("bold"))),
      cardStyle: v.optional(v.union(v.literal("classic"), v.literal("glow"), v.literal("paper"))),
      decor:     v.optional(v.string()),
      colorMode: v.optional(v.union(v.literal("dark"), v.literal("light"))),
    })),
  },
  handler: async (ctx, { shopId, adminSecret, config }) => {
    await requireAdmin(ctx, { secret: adminSecret });

    // Bisherige Bild-IDs merken, um ersetzte/entfernte Dateien NACH dem
    // erfolgreichen Speichern aufzuräumen.
    const prev = await ctx.db.get(shopId);
    const oldBgId   = prev?.designConfig?.bgImageId;
    const oldLogoId = prev?.designConfig?.logoId;

    if (config === null) {
      await ctx.db.patch(shopId, { designConfig: undefined });
      // Design komplett entfernt → beide bisherigen Blobs löschen (keine mehr referenziert)
      await deleteReplacedStorageIds(ctx, [oldBgId, oldLogoId], []);
      return;
    }

    const bgImageUrl = config.bgImageId ? (await ctx.storage.getUrl(config.bgImageId)) ?? undefined : undefined;
    const logoUrl    = config.logoId    ? (await ctx.storage.getUrl(config.logoId))    ?? undefined : undefined;

    await ctx.db.patch(shopId, {
      designConfig: { ...config, bgImageUrl, logoUrl },
      // Ein aktives Signature-Theme würde den Editor überdecken — beim Speichern
      // des Config-Designs wird es deshalb entfernt (was du speicherst, siehst du).
      theme: undefined,
    });

    // Erst NACH erfolgreichem Speichern: alte Dateien löschen, die durch neue
    // ersetzt oder ganz entfernt wurden. Noch referenzierte IDs bleiben erhalten.
    await deleteReplacedStorageIds(
      ctx,
      [oldBgId, oldLogoId],
      [config.bgImageId, config.logoId],
    );
  },
});

// Shop komplett löschen (Admin) — inkl. aller shop-bezogenen Daten.
// Kunden bleiben erhalten (können in anderen Shops Mitgliedschaften haben).
export const adminDeleteShop = mutation({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new ConvexError("Shop nicht gefunden");

    const [stampEvents, messages, memberships] = await Promise.all([
      ctx.db.query("stampEvents").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect(),
      ctx.db.query("messages").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect(),
      ctx.db.query("memberships").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect(),
    ]);

    for (const doc of [...stampEvents, ...messages]) {
      await ctx.db.delete(doc._id);
    }
    for (const m of memberships) await deleteMembership(ctx, m);
    if (shop.ownerId) {
      const owner = await ctx.db.get(shop.ownerId);
      if (owner) await ctx.db.delete(owner._id);
    }
    await ctx.db.delete(shopId);
    // Laden aus den Statistik-Zählern nehmen (Tagessummen bleiben als Historie)
    await clearShopStats(ctx, shopId);

    // Zugehörige Design-Bilder aus dem Storage entfernen (nur die dieses Shops).
    // Fehlende/doppelte IDs werden im Helfer abgefangen; Löschfehler stören den
    // bereits abgeschlossenen Shop-Löschvorgang nicht.
    await deleteReplacedStorageIds(
      ctx,
      [shop.designConfig?.bgImageId, shop.designConfig?.logoId],
      [],
    );

    return {
      deletedMemberships: memberships.length,
      deletedStampEvents: stampEvents.length,
      deletedMessages:    messages.length,
    };
  },
});

export const createShop = mutation({
  args: {
    adminSecret:      v.string(),
    name:             v.string(),
    slug:             v.string(),
    stampsRequired:   v.number(),
    rewardText:       v.string(),
    stampIcon:        v.optional(v.string()),
    stampValue:       v.optional(v.number()),
    ownerName:        v.optional(v.string()),
    ownerEmail:       v.optional(v.string()),
    ownerPhone:       v.optional(v.string()),
    // Shop ohne Abrechnung: Inhaber bekommt sofort eine Willkommens-Mail mit
    // Login-Link. Mit Abrechnung schickt die Partner-App sie erst nach dem
    // Hinterlegen der Zahlungsdaten (sonst käme sie doppelt).
    sendWelcome:      v.optional(v.boolean()),
  },
  handler: async (ctx, { adminSecret, ownerName, ownerEmail, ownerPhone, sendWelcome, ...shopArgs }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    validateRewardSettings(shopArgs);

    // Slug muss eindeutig sein: getBySlug/Join-Links laufen über .unique() und
    // brechen bei Doppelbelegung für ALLE Shops mit diesem Slug. (.first statt
    // .unique, damit der Check auch funktioniert, falls es schon Altlasten gibt.)
    const slugTaken = await ctx.db.query("shops")
      .withIndex("by_slug", q => q.eq("slug", shopArgs.slug))
      .first();
    if (slugTaken) throw new ConvexError(`Slug "${shopArgs.slug}" ist schon vergeben, bitte anderes URL-Kürzel wählen`);

    const adminLoginToken  = crypto.randomUUID();
    const mitarbeiterToken = crypto.randomUUID();

    let ownerId: Id<"owners"> | undefined;
    if (ownerName || ownerEmail) {
      ownerId = await ctx.db.insert("owners", {
        name:      ownerName ?? "",
        email:     ownerEmail,
        phone:     ownerPhone,
        createdAt: Date.now(),
      });
    }

    const shopId = await ctx.db.insert("shops", {
      ...shopArgs,
      ownerId,
      adminLoginToken,
      mitarbeiterToken,
      createdAt: Date.now(),
    });

    if (sendWelcome && ownerEmail) {
      await ctx.scheduler.runAfter(0, internal.ownerMail.sendShopWelcome, {
        shopId, ownerEmail, ownerName: ownerName ?? "", shopName: shopArgs.name,
        adminLoginToken, slug: shopArgs.slug,
      });
    }

    return { shopId, slug: shopArgs.slug, adminLoginToken };
  },
});

// ─── Admin-Queries ────────────────────────────────────────────────────────────

export const listAllShops = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const shops = await ctx.db.query("shops").order("desc").collect();
    return shops.map(sanitizeShop);
  },
});

// Inhaber-Daten eines Shops (für "Abrechnung einrichten" im Vertrag-Tab)
export const getShopOwnerAsAdmin = query({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const shop = await ctx.db.get(shopId);
    const owner = shop?.ownerId ? await ctx.db.get(shop.ownerId) : null;
    return owner
      ? { name: owner.name, email: owner.email ?? null, phone: owner.phone ?? null, welcomeSent: !!shop?.welcomeSentAt }
      : null;
  },
});

export const getLoginLinksForShop = query({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const shop = await ctx.db.get(shopId);
    if (!shop) return null;
    return {
      adminLoginToken: shop.adminLoginToken,
      mitarbeiterToken: shop.mitarbeiterToken ?? null,
    };
  },
});

export const listCustomersForShopAsAdmin = query({
  args: { shopId: v.id("shops"), adminSecret: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminSecret, limit }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(Math.min(limit ?? 500, 500));
    const results = await Promise.all(
      memberships.map(async (m) => {
        const customer = await ctx.db.get(m.customerId);
        return { membership: m, customer };
      })
    );
    return results.filter((r) => r.customer !== null);
  },
});

// ── Analytics: alles in EINEM Durchlauf über die Events, Datenbank-Zugriffe nur
// für die angezeigten Top-Kunden (vorher: pro Kunde alle Events erneut gefiltert
// und jeden Kunden einzeln geladen).

// Sicherheitsnetz: nie unbegrenzt laden. Auch MIT Zeitraum maximal die neuesten
// MAX_ANALYTICS_EVENTS Events; bei extrem aktiven Shops sind die Zahlen dann
// eine Näherung auf Basis der jüngsten Events, was für die Übersicht reicht.
const MAX_ANALYTICS_EVENTS = 15000;
// Kundenliste der Shop-Analytics: die aktivsten N (UI zeigt seitenweise, PDF Top 10)
const ANALYTICS_TOP_CUSTOMERS = 100;

async function computeShopAnalytics(ctx: QueryCtx, shopId: Id<"shops">, since: number | undefined) {
  const shop = await ctx.db.get(shopId);
  const events = await ctx.db.query("stampEvents")
    .withIndex("by_shop_and_timestamp", (q) =>
      since !== undefined ? q.eq("shopId", shopId).gte("timestamp", since) : q.eq("shopId", shopId))
    .order("desc")
    .take(MAX_ANALYTICS_EVENTS);

  let stamps = 0, redeems = 0;
  const rewardMap = new Map<string, number>();
  const byMembership = new Map<string, { id: Id<"memberships">; stamps: number; redeems: number; lastEvent: number }>();
  for (const e of events) {
    const key = e.membershipId.toString();
    // Events kommen neueste zuerst → der erste Treffer ist die letzte Aktivität
    const row = byMembership.get(key) ?? { id: e.membershipId, stamps: 0, redeems: 0, lastEvent: e.timestamp };
    if (e.type === "stamp") { stamps++; row.stamps++; }
    else {
      redeems++; row.redeems++;
      const text = e.rewardText ?? shop?.rewardText ?? "";
      if (text) rewardMap.set(text, (rewardMap.get(text) ?? 0) + 1);
    }
    byMembership.set(key, row);
  }

  const allTiers = [
    ...(shop ? [{ stamps: shop.stampsRequired, text: shop.rewardText }] : []),
    ...(shop?.rewardTiers?.filter(t => t.enabled) ?? []),
  ];
  const rewardBreakdown = Array.from(rewardMap.entries()).map(([text, count]) => {
    const tier = allTiers.find(t => t.text === text);
    const tierStamps = tier?.stamps ?? shop?.stampsRequired ?? 0;
    const valuePerRedemption = shop?.stampValue != null ? tierStamps * shop.stampValue : null;
    return { rewardText: text, count, valuePerRedemption };
  }).sort((a, b) => b.count - a.count);

  const top = Array.from(byMembership.values())
    .sort((a, b) => b.stamps - a.stamps || b.redeems - a.redeems)
    .slice(0, ANALYTICS_TOP_CUSTOMERS);
  const customerRows = await Promise.all(top.map(async (r) => {
    const membership = await ctx.db.get(r.id);
    if (!membership) return null;
    const customer = await ctx.db.get(membership.customerId);
    if (!customer) return null;
    return {
      customerName: customer.name,
      stamps: r.stamps,
      redeems: r.redeems,
      currentStamps: membership.currentStamps,
      totalStampsEver: membership.totalStampsEver,
      lastEvent: r.lastEvent,
      membershipId: membership._id,
    };
  }));

  return {
    stamps,
    redeems,
    stampValue: shop?.stampValue ?? null,
    rewardBreakdown,
    customers: customerRows.filter((r): r is NonNullable<typeof r> => r !== null),
    activeCustomers: byMembership.size,
  };
}

export const getShopAnalyticsByPeriodAsAdmin = query({
  args: { shopId: v.id("shops"), adminSecret: v.string(), since: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminSecret, since }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    return computeShopAnalytics(ctx, shopId, since);
  },
});

export const adminUpdateLegalTexts = mutation({
  args: {
    shopId: v.id("shops"),
    adminSecret: v.string(),
    impressumText: v.optional(v.string()),
    agbText: v.optional(v.string()),
    datenschutzText: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, adminSecret, impressumText, agbText, datenschutzText }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    validateLegalTexts({ impressumText, agbText, datenschutzText });
    await ctx.db.patch(shopId, { impressumText, agbText, datenschutzText });
  },
});

export const getGlobalStats = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    // Nur Läden + ihre Zählerzeile lesen (ausgelegt für 1.000+ Läden)
    const [shops, stats, customerCounter] = await Promise.all([
      ctx.db.query("shops").collect(),
      ctx.db.query("shopStats").collect(),
      ctx.db.query("appCounters").withIndex("by_key", (q) => q.eq("key", "customers")).first(),
    ]);
    const byShop = new Map(stats.map((st) => [st.shopId.toString(), st]));
    let totalStamps = 0, totalRewards = 0;
    const shopsWithCounts = shops.map((shop) => {
      const st = byShop.get(shop._id.toString());
      totalStamps    += st?.stamps ?? 0;
      totalRewards   += st?.rewards ?? 0;
      return { ...sanitizeShop(shop), customerCount: st?.customers ?? 0 };
    });
    // Kunden = Personen (wer in 2 Läden ist, zählt einmal)
    return { totalShops: shops.length, totalCustomers: customerCounter?.value ?? 0, totalStamps, totalRewards, shops: shopsWithCounts };
  },
});

export const getGlobalAnalyticsByPeriod = query({
  args: {
    adminSecret: v.string(),
    since: v.optional(v.number()),
    prevSince: v.optional(v.number()),
  },
  handler: async (ctx, { adminSecret, since, prevSince }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const shops = await ctx.db.query("shops").collect();

    // Summen und Diagramm aus den Tagessummen (16 Zeilen pro Tag statt aller Events)
    const earliest = prevSince ?? since;
    const rows = await ctx.db.query("dailyTotals")
      .withIndex("by_day_and_shard", (q) => earliest !== undefined ? q.gte("day", dayStart(earliest)) : q)
      .order("desc") // neueste Tage zuerst, falls die Obergrenze greift
      .take(20000);
    let stamps = 0, redeems = 0, prevStamps = 0, prevRedeems = 0, newCustomers = 0;
    const dayMap = new Map<number, { stamps: number; redeems: number }>();
    for (const r of rows) {
      const inPeriod = since === undefined || r.day >= dayStart(since);
      if (!inPeriod) {
        if (prevSince !== undefined && r.day >= dayStart(prevSince)) { prevStamps += r.stamps; prevRedeems += r.redeems; }
        continue;
      }
      stamps += r.stamps; redeems += r.redeems; newCustomers += r.newCustomers;
      const d = dayMap.get(r.day) ?? { stamps: 0, redeems: 0 };
      d.stamps += r.stamps; d.redeems += r.redeems;
      dayMap.set(r.day, d);
    }
    const dailyBreakdown = Array.from(dayMap.entries())
      .map(([dayStart, v]) => ({ dayStart, ...v }))
      .sort((a, b) => a.dayStart - b.dayStart)
      .slice(-60);

    // Pro Laden: Gesamtwerte aus der Zählerzeile (Zeitraum je Laden wäre bei
    // 1.000 Läden zu teuer; diese Abfrage wird in der Oberfläche nicht genutzt)
    const shopStatRows = await ctx.db.query("shopStats").collect();
    const statByShop = new Map(shopStatRows.map((st) => [st.shopId.toString(), st]));
    const shopsData = shops.map((shop) => {
      const st = statByShop.get(shop._id.toString());
      return {
        _id: shop._id, name: shop.name, slug: shop.slug,
        stamps: st?.stamps ?? 0, redeems: st?.rewards ?? 0, activeCustomers: st?.customers ?? 0,
        lastActivity: st?.lastActivity ?? null,
      };
    });

    // Top 10 Kunden aus den letzten (höchstens 3.000) Stempeln des Zeitraums
    const recent = await ctx.db.query("stampEvents")
      .withIndex("by_timestamp", (q) => since !== undefined ? q.gte("timestamp", since) : q)
      .order("desc")
      .take(3000);
    const byMembership = new Map<string, { id: Id<"memberships">; stamps: number }>();
    for (const e of recent) {
      if (e.type !== "stamp") continue;
      const k = e.membershipId.toString();
      const m = byMembership.get(k) ?? { id: e.membershipId, stamps: 0 };
      m.stamps++;
      byMembership.set(k, m);
    }
    const shopById = new Map(shops.map((sh) => [sh._id.toString(), sh]));
    const top10 = Array.from(byMembership.values()).sort((a, b) => b.stamps - a.stamps).slice(0, 10);
    const topCustomers = (await Promise.all(top10.map(async (t) => {
      const membership = await ctx.db.get(t.id);
      if (!membership) return null;
      const customer = await ctx.db.get(membership.customerId);
      if (!customer) return null;
      return { name: customer.name, stamps: t.stamps, shopName: shopById.get(membership.shopId.toString())?.name ?? "" };
    }))).filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      totalShops: shops.length,
      stamps,
      redeems,
      activeShops: shopsData.filter((x) => x.lastActivity !== null && (since === undefined || x.lastActivity >= since)).length,
      newCustomers,
      prevStamps,
      prevRedeems,
      dailyBreakdown,
      topCustomers,
      shops: shopsData.sort((a, b) => b.stamps - a.stamps),
    };
  },
});

export const getShopAnalyticsByPeriod = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), since: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminToken, since }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    return computeShopAnalytics(ctx, shopId, since);
  },
});

export const getAppUsageStats = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    // Nur Kunden mit Karten in 2+ Läden (Index auf shopCount), höchstens 200
    const customers = await ctx.db.query("customers")
      .withIndex("by_shopCount", (q) => q.gte("shopCount", 2))
      .order("desc")
      .take(200);
    const rows = await Promise.all(customers.map(async (c) => {
      const mems = await ctx.db.query("memberships")
        .withIndex("by_customer", (q) => q.eq("customerId", c._id))
        .take(100);
      return { name: c.name, shopCount: c.shopCount ?? mems.length, totalStamps: mems.reduce((sum, m) => sum + m.totalStampsEver, 0) };
    }));
    return rows.sort((a, b) => b.shopCount - a.shopCount || b.totalStamps - a.totalStamps);
  },
});

// ─── Inhaber-Queries ──────────────────────────────────────────────────────────

// Kunde für Betrieb/Mitarbeiter aufbereiten: E-Mail nur für den Inhaber und
// nur, wenn Leads freigeschaltet sind; nie den qrToken mitschicken.
async function customerRow(ctx: QueryCtx, m: Doc<"memberships">, showEmail: boolean) {
  const customer = await ctx.db.get(m.customerId);
  if (!customer) return null;
  return {
    membership: m,
    customer: { _id: customer._id, name: customer.name, email: showEmail ? customer.email : "" },
  };
}

// Höchstens so viele Mitgliedschaften werden für Statistik/Suche gelesen
const SHOP_SCAN_CAP = 5000;

// Alt-Variante (Liste mit Limit), nie mehr als 200 Kunden
export const listCustomersForShop = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { shopId, adminToken, limit }) => {
    const shop = await requireShopRole(ctx, { shopId, token: adminToken, role: "mitarbeiter" });
    const showEmail = adminToken === shop.adminLoginToken && !!shop.showLeads;
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(Math.min(limit ?? 200, 200));
    const results = await Promise.all(memberships.map((m) => customerRow(ctx, m, showEmail)));
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

// Seitenweise Kundenliste (neueste zuerst) für "Mehr laden"
export const listCustomersForShopPaged = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { shopId, adminToken, paginationOpts }) => {
    const shop = await requireShopRole(ctx, { shopId, token: adminToken, role: "mitarbeiter" });
    const showEmail = adminToken === shop.adminLoginToken && !!shop.showLeads;
    const result = await ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .paginate(paginationOpts);
    const rows = await Promise.all(result.page.map((m) => customerRow(ctx, m, showEmail)));
    return { ...result, page: rows.filter((r): r is NonNullable<typeof r> => r !== null) };
  },
});

// Kundensuche (Name, #Nummer, E-Mail falls freigeschaltet), max. 30 Treffer
export const searchCustomersForShop = query({
  args: { shopId: v.id("shops"), adminToken: v.string(), search: v.string() },
  handler: async (ctx, { shopId, adminToken, search }) => {
    const shop = await requireShopRole(ctx, { shopId, token: adminToken, role: "mitarbeiter" });
    const showEmail = adminToken === shop.adminLoginToken && !!shop.showLeads;
    const q = search.trim().toLowerCase().replace(/^#/, "");
    if (!q) return [];
    const hits: NonNullable<Awaited<ReturnType<typeof customerRow>>>[] = [];
    let scanned = 0;
    for await (const m of ctx.db.query("memberships").withIndex("by_shop", (ix) => ix.eq("shopId", shopId)).order("desc")) {
      if (++scanned > SHOP_SCAN_CAP || hits.length >= 30) break;
      if (m.memberNumber !== undefined && String(m.memberNumber) === q) {
        const row = await customerRow(ctx, m, showEmail);
        if (row) hits.push(row);
        continue;
      }
      const customer = await ctx.db.get(m.customerId);
      if (!customer) continue;
      if (customer.name.toLowerCase().includes(q) || (showEmail && customer.email.toLowerCase().includes(q))) {
        hits.push({ membership: m, customer: { _id: customer._id, name: customer.name, email: showEmail ? customer.email : "" } });
      }
    }
    return hits;
  },
});

// Kennzahlen eines Shops (echte Gesamtwerte statt Summe der geladenen Liste)
async function computeShopStats(ctx: QueryCtx, shop: Doc<"shops">) {
  const tiers = shop.bonusProgramEnabled && shop.rewardTiers?.some((t) => t.enabled)
    ? shop.rewardTiers.filter((t) => t.enabled).map((t) => t.stamps)
    : [shop.stampsRequired];
  const lowestTier = Math.min(shop.stampsRequired, ...tiers);
  let customers = 0, stamps = 0, rewards = 0, ready = 0;
  // Verschiedene E-Mail-Adressen = abgerechnete Kunden (Preisstufe)
  const emails = new Set<string>();
  for await (const m of ctx.db.query("memberships").withIndex("by_shop", (q) => q.eq("shopId", shop._id))) {
    if (customers >= SHOP_SCAN_CAP) break;
    customers++;
    const customer = await ctx.db.get(m.customerId);
    if (customer) emails.add(customer.email);
    stamps += m.totalStampsEver;
    rewards += m.rewardsRedeemed;
    if (m.currentStamps >= lowestTier) ready++;
  }
  return { customers, billableCustomers: emails.size, stamps, rewards, ready, capped: customers >= SHOP_SCAN_CAP };
}

export const getShopStats = query({
  args: { shopId: v.id("shops"), adminToken: v.string() },
  handler: async (ctx, { shopId, adminToken }) => {
    const shop = await requireShopRole(ctx, { shopId, token: adminToken, role: "mitarbeiter" });
    return computeShopStats(ctx, shop);
  },
});

export const getShopStatsAsAdmin = query({
  args: { shopId: v.id("shops"), adminSecret: v.string() },
  handler: async (ctx, { shopId, adminSecret }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const shop = await ctx.db.get(shopId);
    if (!shop) throw new ConvexError("Shop nicht gefunden");
    return computeShopStats(ctx, shop);
  },
});

// Admin: seitenweise Kundenliste eines Shops (mit E-Mail)
export const listCustomersForShopAsAdminPaged = query({
  args: { shopId: v.id("shops"), adminSecret: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { shopId, adminSecret, paginationOpts }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const result = await ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .paginate(paginationOpts);
    const rows = await Promise.all(result.page.map((m) => customerRow(ctx, m, true)));
    return { ...result, page: rows.filter((r): r is NonNullable<typeof r> => r !== null) };
  },
});

export const adminRestoreCustomerStamps = mutation({
  args: { membershipId: v.id("memberships"), adminSecret: v.string(), stamps: v.number() },
  handler: async (ctx, { membershipId, adminSecret, stamps }) => {
    await requireAdmin(ctx, { secret: adminSecret });
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new ConvexError("Membership not found");
    await ctx.db.patch(membershipId, { currentStamps: Math.max(0, stamps) });
  },
});

export const inhaberResetShopCards = mutation({
  args: { shopId: v.id("shops"), adminToken: v.string() },
  handler: async (ctx, { shopId, adminToken }) => {
    await requireShopRole(ctx, { shopId, token: adminToken, role: "inhaber" });
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
    for (const m of memberships) {
      await ctx.db.patch(m._id, { currentStamps: 0, rewardsRedeemed: 0, lastStampAt: undefined });
    }
    return { resetCount: memberships.length };
  },
});
