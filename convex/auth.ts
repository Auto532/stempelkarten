import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

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

export function requireAdmin({ secret }: { secret: string }) {
  const expected = process.env.ADMIN_PIN;
  if (!expected) throw new ConvexError("ADMIN_PIN nicht gesetzt");
  if (secret !== expected) throw new ConvexError("Nicht autorisiert");
}

export function sanitizeShop(shop: Doc<"shops">) {
  const { adminLoginToken: _a, mitarbeiterToken: _m, ...rest } = shop;
  return rest;
}
