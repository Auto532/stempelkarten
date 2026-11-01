import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { timingSafeEqual } from "./rateLimit";

export async function requireShopRole(
  ctx: QueryCtx | MutationCtx,
  { shopId, token, role }: { shopId: Id<"shops">; token: string; role: "inhaber" | "mitarbeiter" }
): Promise<Doc<"shops">> {
  const shop = await ctx.db.get(shopId);
  if (!shop) throw new ConvexError("Shop nicht gefunden");
  if (role === "inhaber") {
    if (token !== shop.adminLoginToken) throw new ConvexError("Nicht autorisiert");
  } else {
    if (token !== shop.mitarbeiterToken && token !== shop.adminLoginToken)
      throw new ConvexError("Nicht autorisiert");
  }
  return shop;
}

export const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000; // 12 Stunden

// Admin-Zugriff nur mit gültigem Sitzungs-Schlüssel aus checkPin (nicht mit dem
// PIN selbst). Der PIN wird ausschließlich in checkPin geprüft, dort mit Sperre.
export async function requireAdmin(ctx: QueryCtx | MutationCtx, { secret }: { secret: string }) {
  if (!secret) throw new ConvexError("Nicht autorisiert");
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", secret))
    .unique();
  if (!session || session.expiresAt <= Date.now()) throw new ConvexError("Nicht autorisiert");
}

// Zufälliger Schlüssel mit 244 Bit Zufall (zwei UUIDs ohne Bindestriche)
export function newSessionToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

// Schlüssel für die Verbindung zwischen Stempelkarten- und Partner-App
// (Env BRIDGE_SECRET, in beiden Convex-Projekten derselbe Wert).
export function isValidBridgeSecret(secret: unknown): boolean {
  const expected = process.env.BRIDGE_SECRET;
  if (!expected || typeof secret !== "string") return false;
  return timingSafeEqual(secret, expected);
}

export function sanitizeShop(shop: Doc<"shops">) {
  const { adminLoginToken: _a, mitarbeiterToken: _m, ...rest } = shop;
  return rest;
}
