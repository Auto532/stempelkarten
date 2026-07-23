import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

// Firmenprofil für den Kopf des Finanzberichts. Nur ein Datensatz (Yannis
// Unternehmen), nur der Admin darf lesen/schreiben.

const profileFields = {
  companyName:   v.string(),
  ownerName:     v.optional(v.string()),
  street:        v.optional(v.string()),
  zip:           v.optional(v.string()),
  city:          v.optional(v.string()),
  country:       v.optional(v.string()),
  taxId:         v.optional(v.string()),
  vatId:         v.optional(v.string()),
  email:         v.optional(v.string()),
  phone:         v.optional(v.string()),
  website:       v.optional(v.string()),
  smallBusiness: v.optional(v.boolean()),
};

export const getCompanyProfile = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, { adminSecret }) => {
    requireAdmin({ secret: adminSecret });
    return await ctx.db.query("companyProfile").first();
  },
});

export const setCompanyProfile = mutation({
  args: { adminSecret: v.string(), profile: v.object(profileFields) },
  handler: async (ctx, { adminSecret, profile }) => {
    requireAdmin({ secret: adminSecret });
    const existing = await ctx.db.query("companyProfile").first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...profile, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("companyProfile", { ...profile, updatedAt: Date.now() });
    }
  },
});
