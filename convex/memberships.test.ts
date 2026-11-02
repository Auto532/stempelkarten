/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Alle Convex-Funktionsmodule (inkl. _generated) für convex-test. Steht direkt
// in der Testdatei, weil Convex *.test.ts beim Deploy ignoriert.
const modules = import.meta.glob("./**/*.*s");

// Legt einen Test-Shop mit Kunde + Mitgliedschaft an und gibt die IDs zurück.
async function setupShop(
  t: ReturnType<typeof convexTest>,
  opts?: { stampsRequired?: number; active?: boolean },
) {
  return await t.run(async (ctx) => {
    const shopId = await ctx.db.insert("shops", {
      name: "Test Shop",
      slug: "test-shop",
      stampsRequired: opts?.stampsRequired ?? 10,
      rewardText: "Gratis Kaffee",
      adminLoginToken: "admin-token",
      mitarbeiterToken: "staff-token",
      active: opts?.active ?? true,
      createdAt: Date.now(),
    });
    const customerId = await ctx.db.insert("customers", {
      name: "Max", email: "max@example.com", qrToken: "qr-123", createdAt: Date.now(),
    });
    const membershipId = await ctx.db.insert("memberships", {
      customerId, shopId, currentStamps: 0, totalStampsEver: 0, rewardsRedeemed: 0, consentedAt: Date.now(),
    });
    return { shopId, customerId, membershipId };
  });
}

test("addStamp erhöht currentStamps und totalStampsEver", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t);
  const res = await t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" });
  expect(res.rewardReached).toBe(false);
  expect(res.stampsRequired).toBe(10);
  const m = await t.run((ctx) => ctx.db.get(membershipId));
  expect(m?.currentStamps).toBe(1);
  expect(m?.totalStampsEver).toBe(1);
});

test("addStamp meldet rewardReached beim Erreichen der Schwelle", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { stampsRequired: 3 });
  await t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" });
  await t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" });
  const res = await t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" });
  expect(res.rewardReached).toBe(true);
});

test("addStamp blockt Missbrauch: mehr als 10 Stempel in kurzer Zeit", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { stampsRequired: 100 });
  // 10 Stempel sind erlaubt (mehrere pro Besuch sind legitim)
  for (let i = 0; i < 10; i++) {
    await t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" });
  }
  // Der 11. in kurzer Zeit muss blockiert werden
  await expect(
    t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" }),
  ).rejects.toThrow(/Support/);
});

test("addStamp blockt bei deaktiviertem Shop", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { active: false });
  await expect(
    t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" }),
  ).rejects.toThrow(/deaktiviert/);
});

test("addStamp lehnt falschen Token ab", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t);
  await expect(
    t.mutation(api.memberships.addStamp, { membershipId, adminToken: "falscher-token" }),
  ).rejects.toThrow(/autorisiert/i);
});

test("redeemReward zieht die Stempel ab und behält den Überschuss", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { stampsRequired: 10 });
  await t.run((ctx) => ctx.db.patch(membershipId, { currentStamps: 12 }));
  await t.mutation(api.memberships.redeemReward, { membershipId, adminToken: "staff-token" });
  const m = await t.run((ctx) => ctx.db.get(membershipId));
  expect(m?.currentStamps).toBe(2);   // 12 - 10 (Carry-over)
  expect(m?.rewardsRedeemed).toBe(1);
});

test("redeemReward lehnt ab, wenn nicht genug Stempel da sind", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { stampsRequired: 10 });
  await t.run((ctx) => ctx.db.patch(membershipId, { currentStamps: 3 }));
  await expect(
    t.mutation(api.memberships.redeemReward, { membershipId, adminToken: "staff-token" }),
  ).rejects.toThrow(/Nicht genug Stempel/);
  const m = await t.run((ctx) => ctx.db.get(membershipId));
  expect(m?.rewardsRedeemed).toBe(0);
});

test("redeemReward zieht bei einer höheren Prämienstufe deren Stempel ab", async () => {
  const t = convexTest(schema, modules);
  const { shopId, membershipId } = await setupShop(t, { stampsRequired: 10 });
  await t.run(async (ctx) => {
    await ctx.db.patch(shopId, { bonusProgramEnabled: true, rewardTiers: [
      { stamps: 10, text: "Gratis Kaffee", enabled: true },
      { stamps: 20, text: "Kuchen", enabled: true },
    ] });
    await ctx.db.patch(membershipId, { currentStamps: 21 });
  });
  await t.mutation(api.memberships.redeemReward, { membershipId, adminToken: "staff-token", rewardText: "Kuchen", tierStamps: 20 });
  const m = await t.run((ctx) => ctx.db.get(membershipId));
  expect(m?.currentStamps).toBe(1);   // 21 - 20
});

test("updateSettings lässt nicht übergebene Felder unverändert und leert mit null", async () => {
  const t = convexTest(schema, modules);
  const { shopId } = await setupShop(t);
  const tiers = [{ stamps: 10, text: "Gratis Kaffee", enabled: true }, { stamps: 20, text: "Kuchen", enabled: true }];
  await t.run((ctx) => ctx.db.patch(shopId, { rewardTiers: tiers, stampValue: 0.5 }));
  await t.mutation(api.shops.updateSettings, { shopId, adminToken: "admin-token", stampsRequired: 10, rewardText: "Gratis Kaffee" });
  let shop = await t.run((ctx) => ctx.db.get(shopId));
  expect(shop?.rewardTiers).toEqual(tiers);
  expect(shop?.stampValue).toBe(0.5);
  await t.mutation(api.shops.updateSettings, { shopId, adminToken: "admin-token", stampsRequired: 10, rewardText: "Gratis Kaffee", stampValue: null });
  shop = await t.run((ctx) => ctx.db.get(shopId));
  expect(shop?.stampValue).toBeUndefined();
  expect(shop?.rewardTiers).toEqual(tiers);
});

test("confirmPendingRedemption wirft bei zu wenig Stempeln", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { stampsRequired: 10 });
  await t.run((ctx) => ctx.db.patch(membershipId, {
    currentStamps: 3, pendingRedemption: { stamps: 10, rewardText: "Gratis Kaffee" },
  }));
  await expect(
    t.mutation(api.memberships.confirmPendingRedemption, { membershipId, adminToken: "staff-token" }),
  ).rejects.toThrow(/Nicht genug/);
});

test("confirmPendingRedemption löst ein, rechnet Carry-over und räumt pending", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { stampsRequired: 10 });
  await t.run((ctx) => ctx.db.patch(membershipId, {
    currentStamps: 11, pendingRedemption: { stamps: 10, rewardText: "Gratis Kaffee" },
  }));
  const res = await t.mutation(api.memberships.confirmPendingRedemption, { membershipId, adminToken: "staff-token" });
  expect(res.rewardText).toBe("Gratis Kaffee");
  const m = await t.run((ctx) => ctx.db.get(membershipId));
  expect(m?.currentStamps).toBe(1);
  expect(m?.rewardsRedeemed).toBe(1);
  expect(m?.pendingRedemption).toBeUndefined();
});

test("setPendingRedemption akzeptiert die erreichte Basis-Belohnung", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { stampsRequired: 10 });
  await t.run((ctx) => ctx.db.patch(membershipId, { currentStamps: 10 }));
  const res = await t.mutation(api.memberships.setPendingRedemption, {
    qrToken: "qr-123", membershipId, targetStamps: 10,
  });
  expect(res.rewardText).toBe("Gratis Kaffee");
});

test("setPendingRedemption lehnt eine nicht erreichte Belohnung ab", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setupShop(t, { stampsRequired: 10 });
  await t.run((ctx) => ctx.db.patch(membershipId, { currentStamps: 5 }));
  await expect(
    t.mutation(api.memberships.setPendingRedemption, { qrToken: "qr-123", membershipId, targetStamps: 10 }),
  ).rejects.toThrow(/Keine Belohnung/);
});
