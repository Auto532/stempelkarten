import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  owners: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    createdAt: v.number(),
  }),

  shops: defineTable({
    name: v.string(),
    slug: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
    adminLoginToken: v.string(),
    mitarbeiterToken: v.optional(v.string()),
    ownerId: v.optional(v.id("owners")),
    // Shop aktiv? Fehlt/true = aktiv. false = deaktiviert (kein Stempeln mehr).
    // Jetzt manuell im Admin; später automatisch bei abgelaufenem Abo.
    active: v.optional(v.boolean()),
    showLeads: v.optional(v.boolean()),
    bonusProgramEnabled: v.optional(v.boolean()),
    rewardTiers: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    accentColor: v.optional(v.string()),
    customDesignEnabled: v.optional(v.boolean()),
    milestonesEnabled: v.optional(v.boolean()),
    milestones: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    impressumText: v.optional(v.string()),
    agbText: v.optional(v.string()),
    datenschutzText: v.optional(v.string()),
    stampIcon: v.optional(v.string()),
    theme: v.optional(v.string()),
    // Config-Design (99€-Produkt): DB-basiertes Design, gerendert von der
    // generischen Theme-Komponente (app/me/themes/configTheme.tsx) — kein
    // Code/Deploy pro Shop. Ein gesetztes coded Theme (shops.theme) hat Vorrang.
    // *Url-Felder werden serverseitig aus den Storage-IDs aufgelöst (adminSetDesignConfig).
    designConfig: v.optional(v.object({
      // Farben (Hex #rrggbb — Alpha-Ableitungen macht der Renderer)
      accent:   v.string(),
      text:     v.string(),
      textBody: v.string(),
      cardBg:   v.string(),
      // Hintergrund
      bgType:     v.union(v.literal("color"), v.literal("gradient"), v.literal("image")),
      bgColor:    v.optional(v.string()),
      bgColor2:   v.optional(v.string()),
      bgImageId:  v.optional(v.id("_storage")),
      bgImageUrl: v.optional(v.string()),
      // Logo (auf der Karte statt/über dem Shopnamen)
      logoId:  v.optional(v.id("_storage")),
      logoUrl: v.optional(v.string()),
      // Stempel & Kartenstil
      stampIcon: v.optional(v.string()),
      cardStyle: v.optional(v.union(v.literal("classic"), v.literal("glow"))),
    })),
    stampValue: v.optional(v.number()),
    priceInfo: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_adminLoginToken", ["adminLoginToken"])
    .index("by_mitarbeiterToken", ["mitarbeiterToken"]),

  customers: defineTable({
    name: v.string(),
    email: v.string(),
    qrToken: v.string(),
    createdAt: v.number(),
  }).index("by_qrToken", ["qrToken"]).index("by_email", ["email"]),

  memberships: defineTable({
    customerId: v.id("customers"),
    shopId: v.id("shops"),
    currentStamps: v.number(),
    totalStampsEver: v.number(),
    rewardsRedeemed: v.number(),
    lastStampAt: v.optional(v.number()),
    acquisitionType: v.optional(v.union(v.literal("new"), v.literal("returning"))),
    consentedAt: v.optional(v.number()),
    pendingRedemption: v.optional(v.object({
      stamps: v.number(),
      rewardText: v.string(),
    })),
  })
    .index("by_customer", ["customerId"])
    .index("by_shop", ["shopId"])
    .index("by_customer_and_shop", ["customerId", "shopId"]),

  stampEvents: defineTable({
    membershipId: v.id("memberships"),
    shopId: v.id("shops"),
    type: v.union(v.literal("stamp"), v.literal("redeem")),
    rewardText: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_membership", ["membershipId"]).index("by_shop", ["shopId"]),

  messages: defineTable({
    shopId: v.id("shops"),
    membershipId: v.id("memberships"),
    customerId: v.id("customers"),
    text: v.string(),
    read: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_shop", ["shopId"])
    .index("by_membership", ["membershipId"]),

  // Support-Anfragen (Betrieb → Admin), Benachrichtigung via Telegram.
  // Admin kann antworten (reply) — der Betrieb sieht Antwort + Status in der App.
  supportTickets: defineTable({
    shopId: v.id("shops"),
    senderRole: v.union(v.literal("inhaber"), v.literal("mitarbeiter")),
    message: v.string(),
    contact: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("done")),
    reply: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_status", ["status"]).index("by_shop", ["shopId"]),

  // Brute-Force-Schutz für den Admin-PIN (C2)
  authThrottle: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
    lockedUntil: v.optional(v.number()),
  }).index("by_key", ["key"]),
});
