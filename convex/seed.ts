import { internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { insertCustomer, insertMembership, insertStampEvent, DAY_MS } from "./lib/stats";

export const seedBarbershop = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adminLoginToken = crypto.randomUUID();
    const mitarbeiterToken = crypto.randomUUID();
    const shopId = await ctx.db.insert("shops", {
      name: "Oldschool Barbershop",
      slug: "oldschool-barbershop",
      stampsRequired: 8,
      rewardText: "1x Haarschnitt gratis",
      adminLoginToken,
      mitarbeiterToken,
      stampIcon: "scissors",
      theme: "vintage",
      customDesignEnabled: true,
      bonusProgramEnabled: true,
      rewardTiers: [
        { stamps: 8,  text: "1x Haarschnitt gratis", enabled: true },
        { stamps: 16, text: "Bart-Trimmen gratis",   enabled: true },
        { stamps: 24, text: "Komplett-Styling gratis", enabled: true },
      ],
      milestonesEnabled: true,
      milestones: [
        { stamps: 10,  text: "Treuer Stammkunde",       enabled: true },
        { stamps: 25,  text: "VIP-Mitglied",            enabled: true },
        { stamps: 50,  text: "Legendärer Barbershop-Fan", enabled: true },
      ],
      impressumText: "Oldschool Barbershop\nMusterstraße 1\n12345 Musterstadt\n\nInhaber: Max Meister\nTel: +49 151 00000000\nE-Mail: info@oldschool-barbershop.de",
      datenschutzText: "Wir erheben nur die für den Betrieb der digitalen Stempelkarte notwendigen Daten (Name, Telefonnummer). Diese werden nicht an Dritte weitergegeben und ausschließlich zur Verwaltung Ihrer Treuepunkte verwendet. Sie können jederzeit die Löschung Ihrer Daten beantragen.",
      createdAt: Date.now(),
    });

    const kunden = [
      { name: "Max Mustermann", email: "max@example.com",   qrToken: "demo-max",   stamps: 8,  total: 32, redeemed: 3 },
      { name: "Jonas Weber",    email: "jonas@example.com", qrToken: "demo-jonas", stamps: 5,  total: 13, redeemed: 1 },
      { name: "Leon Bauer",     email: "leon@example.com",  qrToken: "demo-leon",  stamps: 2,  total: 2,  redeemed: 0 },
      { name: "Lena Schmidt",   email: "lena@example.com",  qrToken: "demo-lena",  stamps: 0,  total: 8,  redeemed: 1 },
    ];

    for (let idx = 0; idx < kunden.length; idx++) {
      const k = kunden[idx];
      const customerId = await insertCustomer(ctx, {
        name: k.name, email: k.email, qrToken: k.qrToken, createdAt: Date.now(),
      });
      const membershipId = await insertMembership(ctx, {
        customerId, shopId,
        memberNumber: idx + 1,
        currentStamps: k.stamps,
        totalStampsEver: k.total,
        rewardsRedeemed: k.redeemed,
        lastStampAt: Date.now(),
      });
      for (let i = 0; i < k.stamps; i++) {
        await insertStampEvent(ctx, {
          membershipId, shopId, type: "stamp",
          timestamp: Date.now() - (k.stamps - i) * 86400000,
        });
      }
    }

    return { adminLoginToken, mitarbeiterToken, joinLink: "/join/oldschool-barbershop" };
  },
});

// Test-Laden "Test Shop N" mit Kunden und Stempel-Verlauf der letzten 60 Tage.
// Aufruf: npx convex run --prod seed:seedTestShop '{"nr": 1}'
const VORNAMEN = ["Anna", "Ben", "Clara", "David", "Emma", "Felix", "Hannah", "Jonas", "Lea", "Lukas", "Mia", "Noah", "Paul", "Sophie", "Tim", "Laura", "Elias", "Marie", "Finn", "Lina"];
const NACHNAMEN = ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Richter", "Klein", "Wolf", "Neumann"];

export const seedTestShop = internalMutation({
  args: { nr: v.number(), customers: v.optional(v.number()) },
  handler: async (ctx, { nr, customers = 50 }) => {
    const slug = `test-shop-${nr}`;
    const existing = await ctx.db.query("shops").withIndex("by_slug", q => q.eq("slug", slug)).unique();
    if (existing) throw new ConvexError(`${slug} gibt es schon`);

    const now = Date.now();
    const stampsRequired = [6, 8, 10][nr % 3];
    const adminLoginToken = crypto.randomUUID();
    const mitarbeiterToken = crypto.randomUUID();
    const shopId = await ctx.db.insert("shops", {
      name: `Test Shop ${nr}`,
      slug,
      stampsRequired,
      rewardText: "1x gratis",
      adminLoginToken,
      mitarbeiterToken,
      impressumText: `Test Shop ${nr}\nTeststraße ${nr}\n12345 Teststadt\n\nNur Testdaten.`,
      datenschutzText: "Testladen. Es werden nur Name und E-Mail-Adresse für die Stempelkarte gespeichert.",
      createdAt: now,
    });

    for (let i = 0; i < customers; i++) {
      const vorname = VORNAMEN[Math.floor(Math.random() * VORNAMEN.length)];
      const nachname = NACHNAMEN[Math.floor(Math.random() * NACHNAMEN.length)];
      const customerId = await insertCustomer(ctx, {
        name: `${vorname} ${nachname}`,
        email: `test-shop-${nr}-kunde-${i + 1}@example.com`,
        qrToken: crypto.randomUUID(),
        createdAt: now,
      });

      // Bis zu 2 Einlösungen plus angefangene Karte, Zeitpunkte über 60 Tage verteilt
      const redeemed = Math.floor(Math.random() * 3);
      const current = Math.floor(Math.random() * stampsRequired);
      const total = redeemed * stampsRequired + current;
      const times = Array.from({ length: total }, () => now - Math.floor(Math.random() * 60 * DAY_MS)).sort((a, b) => a - b);

      const membershipId = await insertMembership(ctx, {
        customerId, shopId,
        memberNumber: i + 1,
        currentStamps: current,
        totalStampsEver: total,
        rewardsRedeemed: redeemed,
        acquisitionType: Math.random() < 0.6 ? "new" : "returning",
        consentedAt: now,
        ...(total > 0 ? { lastStampAt: times[total - 1] } : {}),
      });
      for (let s = 0; s < total; s++) {
        await insertStampEvent(ctx, { membershipId, shopId, type: "stamp", timestamp: times[s] });
        if ((s + 1) % stampsRequired === 0 && (s + 1) / stampsRequired <= redeemed) {
          await insertStampEvent(ctx, { membershipId, shopId, type: "redeem", rewardText: "1x gratis", timestamp: times[s] + 60_000 });
        }
      }
    }

    return { slug, joinLink: `/join/${slug}`, adminLoginToken, mitarbeiterToken };
  },
});

export const patchShopTheme = internalMutation({
  args: { slug: v.string(), theme: v.string() },
  handler: async (ctx, { slug, theme }) => {
    const shop = await ctx.db.query("shops").withIndex("by_slug", q => q.eq("slug", slug)).unique();
    if (!shop) throw new ConvexError("Shop nicht gefunden");
    await ctx.db.patch(shop._id, { theme, customDesignEnabled: true });
    return "OK";
  },
});
