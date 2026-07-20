import { internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

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
      const customerId = await ctx.db.insert("customers", {
        name: k.name, email: k.email, qrToken: k.qrToken, createdAt: Date.now(),
      });
      const membershipId = await ctx.db.insert("memberships", {
        customerId, shopId,
        memberNumber: idx + 1,
        currentStamps: k.stamps,
        totalStampsEver: k.total,
        rewardsRedeemed: k.redeemed,
        lastStampAt: Date.now(),
      });
      for (let i = 0; i < k.stamps; i++) {
        await ctx.db.insert("stampEvents", {
          membershipId, shopId, type: "stamp",
          timestamp: Date.now() - (k.stamps - i) * 86400000,
        });
      }
    }

    return { adminLoginToken, mitarbeiterToken, joinLink: "/join/oldschool-barbershop" };
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
