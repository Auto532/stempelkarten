/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Alle Convex-Funktionsmodule (inkl. _generated) für convex-test. Steht direkt
// in der Testdatei, weil Convex *.test.ts beim Deploy ignoriert.
const modules = import.meta.glob("./**/*.*s");

async function setup(t: ReturnType<typeof convexTest>, totalStampsEver = 10) {
  return await t.run(async (ctx) => {
    const shopId = await ctx.db.insert("shops", {
      name: "Test Shop", slug: "test-shop", stampsRequired: 10, rewardText: "Kaffee",
      adminLoginToken: "admin-token", mitarbeiterToken: "staff-token", active: true, createdAt: Date.now(),
    });
    const customerId = await ctx.db.insert("customers", {
      name: "Max", email: "max@example.com", qrToken: "qr-1", createdAt: Date.now(),
    });
    const membershipId = await ctx.db.insert("memberships", {
      customerId, shopId, currentStamps: 0, totalStampsEver, rewardsRedeemed: 0, consentedAt: Date.now(),
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

test("sendMessage blockt eine zweite Nachricht in derselben Woche", async () => {
  const t = convexTest(schema, modules);
  const { shopId, customerId, membershipId } = await setup(t);
  // Letzte Nachricht vor 6 Tagen: Woche noch nicht um
  await t.run((ctx) => ctx.db.insert("messages", {
    shopId, membershipId, customerId, text: "alt", read: false, createdAt: Date.now() - 6 * 86_400_000,
  }));
  await expect(
    t.mutation(api.messages.sendMessage, { qrToken: "qr-1", membershipId, text: "Zweite" }),
  ).rejects.toThrow(/pro Woche/i);
});

test("sendMessage erlaubt die naechste Nachricht nach einer Woche", async () => {
  const t = convexTest(schema, modules);
  const { shopId, customerId, membershipId } = await setup(t);
  await t.run((ctx) => ctx.db.insert("messages", {
    shopId, membershipId, customerId, text: "alt", read: false, createdAt: Date.now() - 8 * 86_400_000,
  }));
  await t.mutation(api.messages.sendMessage, { qrToken: "qr-1", membershipId, text: "Neu" });
  const msgs = await t.run((ctx) => ctx.db.query("messages").collect());
  expect(msgs).toHaveLength(2);
});

test("sendMessage blockt unter 10 Stempeln", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setup(t, 9);
  await expect(
    t.mutation(api.messages.sendMessage, { qrToken: "qr-1", membershipId, text: "Hi" }),
  ).rejects.toThrow(/ab 10 Stempeln/i);
});

test("getFeedbackStatus nennt den naechsten erlaubten Zeitpunkt", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setup(t);
  expect((await t.query(api.messages.getFeedbackStatus, { qrToken: "qr-1", membershipId }))?.nextAllowedAt).toBeNull();
  await t.mutation(api.messages.sendMessage, { qrToken: "qr-1", membershipId, text: "Hallo" });
  const status = await t.query(api.messages.getFeedbackStatus, { qrToken: "qr-1", membershipId });
  expect(status!.nextAllowedAt!).toBeGreaterThan(Date.now() + 6 * 86_400_000);
  expect(await t.query(api.messages.getFeedbackStatus, { qrToken: "fremd", membershipId })).toBeNull();
});

test("sendMessage lehnt fremde Mitgliedschaft ab", async () => {
  const t = convexTest(schema, modules);
  const { membershipId } = await setup(t);
  await expect(
    t.mutation(api.messages.sendMessage, { qrToken: "anderer-token", membershipId, text: "Hi" }),
  ).rejects.toThrow(/autorisiert/i);
});
