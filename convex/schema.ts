import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  owners: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    createdAt: v.number(),
  }),

  shops: defineTable({
    name: v.string(),
    slug: v.string(),
    stampsRequired: v.number(),
    rewardText: v.string(),
    adminLoginToken: v.string(),
    mitarbeiterToken: v.optional(v.string()),
    ownerId: v.optional(v.id("owners")),
    showLeads: v.optional(v.boolean()),
    bonusProgramEnabled: v.optional(v.boolean()),
    rewardTiers: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    accentColor: v.optional(v.string()),
    customDesignEnabled: v.optional(v.boolean()),
    milestonesEnabled: v.optional(v.boolean()),
    milestones: v.optional(v.array(v.object({
      stamps: v.number(),
      text: v.string(),
      enabled: v.boolean(),
    }))),
    impressumText: v.optional(v.string()),
    agbText: v.optional(v.string()),
    datenschutzText: v.optional(v.string()),
    stampIcon: v.optional(v.string()),
    theme: v.optional(v.string()),
    stampValue: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_adminLoginToken", ["adminLoginToken"])
    .index("by_mitarbeiterToken", ["mitarbeiterToken"]),

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
    acquisitionType: v.optional(v.union(v.literal("new"), v.literal("returning"))),
    consentedAt: v.optional(v.number()),
    pendingRedemption: v.optional(v.object({
      stamps: v.number(),
      rewardText: v.string(),
    })),
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

  messages: defineTable({
    shopId: v.id("shops"),
    membershipId: v.id("memberships"),
    customerId: v.id("customers"),
    text: v.string(),
    read: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_shop", ["shopId"])
    .index("by_membership", ["membershipId"]),
});
