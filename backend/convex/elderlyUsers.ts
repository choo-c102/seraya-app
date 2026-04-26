import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    organizationId: v.id("organizations"),
    caregiverId: v.id("caregivers"),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const deviceToken =
      "eld_" +
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2) +
      Date.now().toString(36);

    const elderlyId = await ctx.db.insert("elderlyUsers", {
      name: args.name,
      deviceToken,
      organizationId: args.organizationId,
      createdAt: Date.now(),
      language: args.language,
    });

    await ctx.db.insert("caregiverAssignments", {
      caregiverId: args.caregiverId,
      elderlyUserId: elderlyId,
      assignedAt: Date.now(),
    });

    return { elderlyId, deviceToken };
  },
});

export const getMyElderlyUsers = query({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("caregiverAssignments")
      .withIndex("by_caregiver", (q) => q.eq("caregiverId", args.caregiverId))
      .collect();

    const today = new Date().toISOString().split("T")[0];
    const results = [];

    for (const assignment of assignments) {
      const elderly = await ctx.db.get(assignment.elderlyUserId);
      if (!elderly) continue;

      const todayResponse = await ctx.db
        .query("dailyResponses")
        .withIndex("by_elderly_user_and_date", (q) =>
          q.eq("elderlyUserId", elderly._id).eq("date", today)
        )
        .first();

      const unreadAlerts = await ctx.db
        .query("alerts")
        .withIndex("by_elderly_user_unread", (q) =>
          q.eq("elderlyUserId", elderly._id).eq("isRead", false)
        )
        .collect();

      let avatarUrl = null;
      if (elderly.avatarStorageId) {
        avatarUrl = await ctx.storage.getUrl(elderly.avatarStorageId);
      }

      results.push({
        ...elderly,
        avatarUrl,
        todayStatus: todayResponse
          ? ("completed" as const)
          : ("pending" as const),
        lastCheckIn: todayResponse?.completedAt ?? null,
        alertCount: unreadAlerts.length,
      });
    }

    return results;
  },
});

export const getProfile = query({
  args: { deviceToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("elderlyUsers")
      .withIndex("by_device_token", (q) =>
        q.eq("deviceToken", args.deviceToken)
      )
      .unique();

    if (!user) return null;

    const questionnaire = await ctx.db
      .query("questionnaires")
      .withIndex("by_elderly_user_active", (q) =>
        q.eq("elderlyUserId", user._id).eq("isActive", true)
      )
      .first();

    let questions = null;
    if (questionnaire) {
      questions = await ctx.db
        .query("questions")
        .withIndex("by_questionnaire", (q) =>
          q.eq("questionnaireId", questionnaire._id)
        )
        .collect();
      questions.sort((a, b) => a.orderIndex - b.orderIndex);

      for (const q of questions) {
        if (q.imageType === "custom" && q.imageStorageId) {
          (q as any).imageUrl = await ctx.storage.getUrl(q.imageStorageId);
        }
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const todayResponse = await ctx.db
      .query("dailyResponses")
      .withIndex("by_elderly_user_and_date", (q) =>
        q.eq("elderlyUserId", user._id).eq("date", today)
      )
      .first();

    return {
      user,
      questionnaire,
      questions,
      todayCompleted: todayResponse !== null,
    };
  },
});

export const updatePushToken = mutation({
  args: {
    deviceToken: v.string(),
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("elderlyUsers")
      .withIndex("by_device_token", (q) =>
        q.eq("deviceToken", args.deviceToken)
      )
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { pushToken: args.pushToken });
  },
});

export const updateAvatar = mutation({
  args: {
    elderlyUserId: v.id("elderlyUsers"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.elderlyUserId, {
      avatarStorageId: args.storageId,
    });
  },
});

export const assignCaregiver = mutation({
  args: {
    caregiverId: v.id("caregivers"),
    elderlyUserId: v.id("elderlyUsers"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("caregiverAssignments")
      .withIndex("by_caregiver_and_elderly", (q) =>
        q
          .eq("caregiverId", args.caregiverId)
          .eq("elderlyUserId", args.elderlyUserId)
      )
      .unique();

    if (existing) {
      throw new Error("Assignment already exists");
    }

    return await ctx.db.insert("caregiverAssignments", {
      caregiverId: args.caregiverId,
      elderlyUserId: args.elderlyUserId,
      assignedAt: Date.now(),
    });
  },
});
