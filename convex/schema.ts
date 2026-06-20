import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shops: defineTable({
    name: v.string(),
    slug: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
    adminLoginToken: v.string(),
    showLeads: v.optional(v.boolean()),
    bonusProgramEnabled: v.optional(v.boolean()),
    rewardTiers: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    accentColor: v.optional(v.string()),
    customDesignEnabled: v.optional(v.boolean()),
    impressumText: v.optional(v.string()),
    agbText: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]).index("by_adminLoginToken", ["adminLoginToken"]),

  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    qrToken: v.string(),
    createdAt: v.number(),
  }).index("by_qrToken", ["qrToken"]).index("by_phone", ["phone"]),

  memberships: defineTable({
    customerId: v.id("customers"),
    shopId: v.id("shops"),
    currentStamps: v.number(),
    totalStampsEver: v.number(),
    rewardsRedeemed: v.number(),
    lastStampAt: v.optional(v.number()),
  })
    .index("by_customer", ["customerId"])
    .index("by_shop", ["shopId"])
    .index("by_customer_and_shop", ["customerId", "shopId"]),

  stampEvents: defineTable({
    membershipId: v.id("memberships"),
    shopId: v.id("shops"),
    type: v.union(v.literal("stamp"), v.literal("redeem")),
    rewardText: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_membership", ["membershipId"]).index("by_shop", ["shopId"]),
});
