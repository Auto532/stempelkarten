import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { isValidBridgeSecret } from "./auth";

const http = httpRouter();

http.route({
  path: "/provision-shop",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { secret, shopName, affiliateLeadId } = body;

    // Eigener Brücken-Schlüssel statt Admin-PIN (BRIDGE_SECRET in beiden Apps)
    if (!isValidBridgeSecret(secret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(internal.shops.provisionShopFromAffiliate, {
      shopName,
      affiliateLeadId,
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
