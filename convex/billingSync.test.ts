/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

// Abgerechnet wird pro Kunde (E-Mail-Adresse), nicht pro Karte.
test("mehrere Karten mit derselben E-Mail zählen als ein Kunde", async () => {
  const t = convexTest(schema, modules);
  const shopId = await t.run(async (ctx) => {
    const shopId = await ctx.db.insert("shops", {
      name: "Test Shop", slug: "test-shop", stampsRequired: 10, rewardText: "Gratis Kaffee",
      adminLoginToken: "admin-token", mitarbeiterToken: "staff-token", active: true, createdAt: Date.now(),
    });
    // Max hat zwei Karten (z. B. neues Handy), Anna eine
    for (const [email, qr] of [["max@example.com", "qr-1"], ["max@example.com", "qr-2"], ["anna@example.com", "qr-3"]]) {
      const customerId = await ctx.db.insert("customers", { name: "Test", email, qrToken: qr, createdAt: Date.now() });
      await ctx.db.insert("memberships", {
        customerId, shopId, currentStamps: 0, totalStampsEver: 0, rewardsRedeemed: 0, consentedAt: Date.now(),
      });
    }
    return shopId;
  });
  const count = await t.query(internal.billingSync.getCardCount, { shopId });
  expect(count).toBe(2);
});
