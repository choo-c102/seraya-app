import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    createdBy: v.id("caregivers"),
    createdAt: v.number(),
  }),

  caregivers: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    organizationId: v.id("organizations"),
    invitedBy: v.optional(v.id("caregivers")),
    pushToken: v.optional(v.string()),
    language: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_organization", ["organizationId"]),

  elderlyUsers: defineTable({
    name: v.string(),
    deviceToken: v.string(),
    organizationId: v.id("organizations"),
    avatarStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    language: v.string(),
    pushToken: v.optional(v.string()),
    reminderTime: v.optional(v.string()),
  })
    .index("by_device_token", ["deviceToken"])
    .index("by_organization", ["organizationId"]),

  caregiverAssignments: defineTable({
    caregiverId: v.id("caregivers"),
    elderlyUserId: v.id("elderlyUsers"),
    assignedAt: v.number(),
  })
    .index("by_caregiver", ["caregiverId"])
    .index("by_elderly_user", ["elderlyUserId"])
    .index("by_caregiver_and_elderly", ["caregiverId", "elderlyUserId"]),

  questionnaires: defineTable({
    elderlyUserId: v.id("elderlyUsers"),
    createdBy: v.id("caregivers"),
    title: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_elderly_user", ["elderlyUserId"])
    .index("by_elderly_user_active", ["elderlyUserId", "isActive"])
    .index("by_created_by", ["createdBy"]),

  questions: defineTable({
    questionnaireId: v.id("questionnaires"),
    orderIndex: v.number(),
    imageType: v.union(v.literal("builtin"), v.literal("custom")),
    imageId: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    altText: v.string(),
    responseType: v.union(v.literal("scale"), v.literal("boolean")),
    alertThreshold: v.optional(
      v.object({
        value: v.number(),
        consecutiveDays: v.number(),
      })
    ),
  }).index("by_questionnaire", ["questionnaireId"]),

  dailyResponses: defineTable({
    elderlyUserId: v.id("elderlyUsers"),
    questionnaireId: v.id("questionnaires"),
    date: v.string(),
    completedAt: v.number(),
    isBackfill: v.boolean(),
    answers: v.array(
      v.object({
        questionId: v.id("questions"),
        value: v.number(),
      })
    ),
  })
    .index("by_elderly_user", ["elderlyUserId"])
    .index("by_elderly_user_and_date", ["elderlyUserId", "date"])
    .index("by_questionnaire", ["questionnaireId"])
    .index("by_elderly_and_questionnaire", [
      "elderlyUserId",
      "questionnaireId",
    ]),

  alerts: defineTable({
    elderlyUserId: v.id("elderlyUsers"),
    questionId: v.id("questions"),
    alertType: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_elderly_user", ["elderlyUserId"])
    .index("by_elderly_user_unread", ["elderlyUserId", "isRead"]),

  inviteLinks: defineTable({
    organizationId: v.id("organizations"),
    createdBy: v.id("caregivers"),
    token: v.string(),
    expiresAt: v.number(),
    usedBy: v.optional(v.id("caregivers")),
  })
    .index("by_token", ["token"])
    .index("by_organization", ["organizationId"]),

  notifications: defineTable({
    caregiverId: v.id("caregivers"),
    elderlyUserId: v.id("elderlyUsers"),
    type: v.union(
      v.literal("check_in_complete"),
      v.literal("alert"),
      v.literal("reminder")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_caregiver", ["caregiverId"])
    .index("by_caregiver_unread", ["caregiverId", "isRead"])
    .index("by_caregiver_created", ["caregiverId", "createdAt"]),
});
