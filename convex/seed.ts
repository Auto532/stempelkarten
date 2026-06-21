import { internalMutation } from "./_generated/server";

export const seedBarbershop = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adminLoginToken = crypto.randomUUID();
    const shopId = await ctx.db.insert("shops", {
      name: "Oldschool Barbershop",
      slug: "oldschool-barbershop",
      stampsRequired: 8,
      rewardText: "1x Haarschnitt gratis",
      adminLoginToken,
      stampIcon: "scissors",
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
      { name: "Max Mustermann", phone: "+49 151 11111111", qrToken: "demo-max",   stamps: 8,  total: 32, redeemed: 3 },
      { name: "Jonas Weber",    phone: "+49 151 22222222", qrToken: "demo-jonas", stamps: 5,  total: 13, redeemed: 1 },
      { name: "Leon Bauer",     phone: "+49 151 33333333", qrToken: "demo-leon",  stamps: 2,  total: 2,  redeemed: 0 },
      { name: "Lena Schmidt",   phone: "+49 151 44444444", qrToken: "demo-lena",  stamps: 0,  total: 8,  redeemed: 1 },
    ];

    for (const k of kunden) {
      const customerId = await ctx.db.insert("customers", {
        name: k.name, phone: k.phone, qrToken: k.qrToken, createdAt: Date.now(),
      });
      const membershipId = await ctx.db.insert("memberships", {
        customerId, shopId,
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

    return { adminLoginToken, joinLink: "/join/oldschool-barbershop" };
  },
});
