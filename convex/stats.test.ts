/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

// Zähler laufen bei Anmeldung und Stempeln automatisch mit (lib/stats.ts)
test("Anmeldung und Stempeln führen die Statistik-Zähler mit", async () => {
  const t = convexTest(schema, modules);
  const shopId = await t.run((ctx) => ctx.db.insert("shops", {
    name: "Test Shop", slug: "test-shop", stampsRequired: 10, rewardText: "Gratis Kaffee",
    adminLoginToken: "admin-token", mitarbeiterToken: "staff-token", active: true, createdAt: Date.now(),
  }));

  const { qrToken } = await t.mutation(api.customers.registerCustomer, { name: "Max", email: "max@example.com", shopSlug: "test-shop" });
  const res = await t.query(api.customers.getMembershipsForCustomer, { qrToken });
  const membershipId = res!.memberships[0].membership._id;
  await t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" });
  await t.mutation(api.memberships.addStamp, { membershipId, adminToken: "staff-token" });

  const { stats, daily, counter, customer } = await t.run(async (ctx) => ({
    stats: await ctx.db.query("shopStats").withIndex("by_shop", (q) => q.eq("shopId", shopId)).unique(),
    daily: await ctx.db.query("dailyTotals").collect(),
    counter: await ctx.db.query("appCounters").withIndex("by_key", (q) => q.eq("key", "customers")).unique(),
    customer: await ctx.db.query("customers").withIndex("by_qrToken", (q) => q.eq("qrToken", qrToken)).unique(),
  }));
  expect(stats?.customers).toBe(1);
  expect(stats?.stamps).toBe(2);
  expect(daily.reduce((s, d) => s + d.stamps, 0)).toBe(2);
  expect(daily.reduce((s, d) => s + d.newCustomers, 0)).toBe(1);
  expect(counter?.value).toBe(1);
  expect(customer?.shopCount).toBe(1);
});
