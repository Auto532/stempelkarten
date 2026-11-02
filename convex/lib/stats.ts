// Skalierbare Statistiken: Zähler statt "alles lesen".
// Belastungstest: 300 Läden / 15.000 Kunden, ausgelegt für 1.000+ Läden.
//
// WICHTIG: Stempel-Events, Karten (memberships) und Kunden IMMER über die
// Helfer unten anlegen bzw. löschen, sonst laufen die Zähler auseinander.
//
// - shopStats: eine Zeile pro Laden (Kunden, Stempel, Einlösungen). Wird nur
//   von Aktionen DIESES Ladens geschrieben, also keine Konflikte zwischen Läden.
// - dailyTotals: Tagessummen für das Admin-Diagramm, pro Tag auf 64 Zeilen
//   verteilt, damit gleichzeitige Stempel verschiedener Läden sich nicht stören.
// - appCounters: wenige globale Zähler (z. B. Kunden gesamt), selten geschrieben.

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const DAILY_SHARDS = 64;

export function dayStart(ts: number): number {
  return Math.floor(ts / DAY_MS) * DAY_MS;
}

export function shardOf(shopId: Id<"shops">): number {
  let h = 0;
  for (const ch of shopId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % DAILY_SHARDS;
}

type ShopStatField = "customers" | "stamps" | "rewards";

async function bumpShop(ctx: MutationCtx, shopId: Id<"shops">, field: ShopStatField, by: number, ts?: number): Promise<void> {
  // .first() statt .unique(): eine versehentliche Doppelzeile (z. B. durch einen
  // parallel laufenden Neuaufbau) darf Stempeln nie blockieren.
  const row = await ctx.db.query("shopStats").withIndex("by_shop", (q) => q.eq("shopId", shopId)).first();
  if (row) {
    await ctx.db.patch(row._id, {
      [field]: Math.max(0, row[field] + by),
      ...(ts !== undefined && by > 0 ? { lastActivity: Math.max(row.lastActivity ?? 0, ts) } : {}),
    });
  } else if (by > 0) {
    await ctx.db.insert("shopStats", { shopId, customers: 0, stamps: 0, rewards: 0, [field]: by, ...(ts !== undefined ? { lastActivity: ts } : {}) });
  }
}

async function bumpDaily(ctx: MutationCtx, shopId: Id<"shops">, ts: number, field: "stamps" | "redeems" | "newCustomers", by = 1): Promise<void> {
  const day = dayStart(ts), shard = shardOf(shopId);
  const row = await ctx.db.query("dailyTotals")
    .withIndex("by_day_and_shard", (q) => q.eq("day", day).eq("shard", shard))
    .first();
  if (row) {
    await ctx.db.patch(row._id, { [field]: Math.max(0, row[field] + by) });
  } else if (by > 0) {
    await ctx.db.insert("dailyTotals", { day, shard, stamps: 0, redeems: 0, newCustomers: 0, [field]: by });
  }
}

export async function bumpAppCounter(ctx: MutationCtx, key: string, by: number): Promise<void> {
  const row = await ctx.db.query("appCounters").withIndex("by_key", (q) => q.eq("key", key)).first();
  if (row) await ctx.db.patch(row._id, { value: Math.max(0, row.value + by) });
  else if (by > 0) await ctx.db.insert("appCounters", { key, value: by });
}

type NewStampEvent = Omit<Doc<"stampEvents">, "_id" | "_creationTime">;
type NewMembership = Omit<Doc<"memberships">, "_id" | "_creationTime">;
type NewCustomer = Omit<Doc<"customers">, "_id" | "_creationTime">;

export async function insertStampEvent(ctx: MutationCtx, data: NewStampEvent): Promise<Id<"stampEvents">> {
  const id = await ctx.db.insert("stampEvents", data);
  const isStamp = data.type === "stamp";
  await bumpShop(ctx, data.shopId, isStamp ? "stamps" : "rewards", 1, data.timestamp);
  await bumpDaily(ctx, data.shopId, data.timestamp, isStamp ? "stamps" : "redeems");
  return id;
}

export async function insertMembership(ctx: MutationCtx, data: NewMembership): Promise<Id<"memberships">> {
  const id = await ctx.db.insert("memberships", data);
  await bumpShop(ctx, data.shopId, "customers", 1);
  await bumpDaily(ctx, data.shopId, Date.now(), "newCustomers");
  const customer = await ctx.db.get(data.customerId);
  if (customer) await ctx.db.patch(customer._id, { shopCount: (customer.shopCount ?? 0) + 1 });
  return id;
}

export async function insertCustomer(ctx: MutationCtx, data: NewCustomer): Promise<Id<"customers">> {
  const id = await ctx.db.insert("customers", data);
  await bumpAppCounter(ctx, "customers", 1);
  return id;
}

// Karte löschen (Zähler mitführen; Tagessummen bleiben als Historie)
export async function deleteMembership(ctx: MutationCtx, doc: Doc<"memberships">): Promise<void> {
  await ctx.db.delete(doc._id);
  await bumpShop(ctx, doc.shopId, "customers", -1);
  const customer = await ctx.db.get(doc.customerId);
  if (customer) await ctx.db.patch(customer._id, { shopCount: Math.max(0, (customer.shopCount ?? 1) - 1) });
}

// Ganzen Laden aus den Zählern nehmen (beim Löschen eines Shops)
export async function clearShopStats(ctx: MutationCtx, shopId: Id<"shops">): Promise<void> {
  const row = await ctx.db.query("shopStats").withIndex("by_shop", (q) => q.eq("shopId", shopId)).unique();
  if (row) await ctx.db.delete(row._id);
}

// Alles zurücksetzen (Alles-Löschen im Admin)
export async function clearAllStats(ctx: MutationCtx): Promise<void> {
  for (const table of ["shopStats", "dailyTotals", "appCounters"] as const) {
    for (const row of await ctx.db.query(table).collect()) await ctx.db.delete(row._id);
  }
}
