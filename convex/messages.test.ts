/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Alle Convex-Funktionsmodule (inkl. _generated) für convex-test. Steht direkt
// in der Testdatei, weil Convex *.test.ts beim Deploy ignoriert.
const modules = import.meta.glob("./**/*.*s");

async function setup(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const shopId = await ctx.db.insert("shops", {
      name: "Test Shop", slug: "test-shop", stampsRequired: 10, rewardText: "Kaffee",
      adminLoginToken: "admin-token", mitarbeiterToken: "staff-token", active: true, createdAt: Date.now(),
    });
    const customerId = await ctx.db.insert("customers", {
      name: "Max", email: "max@example.com", qrToken: "qr-1", createdAt: Date.now(),
    });
    const membershipId = await ctx.db.insert("memberships", {
      customerId, shopId, currentStamps: 0, totalStampsEver: 0, rewardsRedeemed: 0, consentedAt: Date.now(),
    });
    return { shopId, customerId, membershipId };
  });
}

test("sendMessage speichert eine Nachricht", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setup(t);
  await t.mutation(api.messages.sendMessage, { qrToken: "qr-1", membershipId, text: "Hallo" });
  const msgs = await t.run((ctx) => ctx.db.query("messages").collect());
  expect(msgs).toHaveLength(1);
  expect(msgs[0].text).toBe("Hallo");
});

test("sendMessage blockt eine zweite Nachricht im Cooldown", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setup(t);
  await t.mutation(api.messages.sendMessage, { qrToken: "qr-1", membershipId, text: "Erste" });
  await expect(
    t.mutation(api.messages.sendMessage, { qrToken: "qr-1", membershipId, text: "Zweite" }),
  ).rejects.toThrow(/warte/i);
});

test("sendMessage blockt beim Tageslimit (max 3 in 24 h)", async () => {
  const t = convexTest(schema, modules);
  const { shopId, customerId, membershipId } = await setup(t);
  // 3 ältere Nachrichten: Cooldown vorbei (10 Min her), aber innerhalb 24 h
  const past = Date.now() - 10 * 60_000;
  await t.run(async (ctx) => {
    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("messages", {
        shopId, membershipId, customerId, text: `alt ${i}`, read: false, createdAt: past,
      });
    }
  });
  await expect(
    t.mutation(api.messages.sendMessage, { qrToken: "qr-1", membershipId, text: "Vierte" }),
  ).rejects.toThrow(/Limit/i);
});

test("sendMessage lehnt fremde Mitgliedschaft ab", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setup(t);
  await expect(
    t.mutation(api.messages.sendMessage, { qrToken: "anderer-token", membershipId, text: "Hi" }),
  ).rejects.toThrow(/autorisiert/i);
});
