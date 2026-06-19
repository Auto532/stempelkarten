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
      createdAt: Date.now(),
    });

    const kunden = [
      { name: "Max Mustermann", phone: "+49 151 11111111", qrToken: "demo-max", stamps: 8 },
      { name: "Jonas Weber",    phone: "+49 151 22222222", qrToken: "demo-jonas", stamps: 5 },
      { name: "Leon Bauer",     phone: "+49 151 33333333", qrToken: "demo-leon", stamps: 2 },
    ];

    for (const k of kunden) {
      const customerId = await ctx.db.insert("customers", {
        name: k.name, phone: k.phone, qrToken: k.qrToken, createdAt: Date.now(),
      });
      const membershipId = await ctx.db.insert("memberships", {
        customerId, shopId,
        currentStamps: k.stamps, totalStampsEver: k.stamps, rewardsRedeemed: 0,
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
