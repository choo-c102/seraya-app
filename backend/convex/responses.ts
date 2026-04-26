import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  args: {
    deviceToken: v.string(),
    questionnaireId: v.id("questionnaires"),
    date: v.string(),
    isBackfill: v.boolean(),
    answers: v.array(
      v.object({
        questionId: v.id("questions"),
        value: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("elderlyUsers")
      .withIndex("by_device_token", (q) =>
        q.eq("deviceToken", args.deviceToken)
      )
      .unique();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("dailyResponses")
      .withIndex("by_elderly_user_and_date", (q) =>
        q.eq("elderlyUserId", user._id).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        answers: args.answers,
        completedAt: Date.now(),
        isBackfill: args.isBackfill,
      });
      return existing._id;
    }

    const responseId = await ctx.db.insert("dailyResponses", {
      elderlyUserId: user._id,
      questionnaireId: args.questionnaireId,
      date: args.date,
      completedAt: Date.now(),
      isBackfill: args.isBackfill,
      answers: args.answers,
    });

    const assignments = await ctx.db
      .query("caregiverAssignments")
      .withIndex("by_elderly_user", (q) => q.eq("elderlyUserId", user._id))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.insert("notifications", {
        caregiverId: assignment.caregiverId,
        elderlyUserId: user._id,
        type: "check_in_complete",
        title: `${user.name} completed check-in`,
        message: `${user.name} completed their daily check-in for ${args.date}`,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return responseId;
  },
});

export const getTodayStatus = query({
  args: { deviceToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("elderlyUsers")
      .withIndex("by_device_token", (q) =>
        q.eq("deviceToken", args.deviceToken)
      )
      .unique();

    if (!user) return null;

    const today = new Date().toISOString().split("T")[0];
    const response = await ctx.db
      .query("dailyResponses")
      .withIndex("by_elderly_user_and_date", (q) =>
        q.eq("elderlyUserId", user._id).eq("date", today)
      )
      .first();

    return {
      completed: response !== null,
      date: today,
    };
  },
});

export const getByDateRange = query({
  args: {
    elderlyUserId: v.id("elderlyUsers"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("dailyResponses")
      .withIndex("by_elderly_user", (q) =>
        q.eq("elderlyUserId", args.elderlyUserId)
      )
      .collect();

    return responses.filter(
      (r) => r.date >= args.startDate && r.date <= args.endDate
    );
  },
});

export const getMonthResponses = query({
  args: {
    elderlyUserId: v.id("elderlyUsers"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const startDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const lastDay = new Date(args.year, args.month, 0).getDate();
    const endDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const responses = await ctx.db
      .query("dailyResponses")
      .withIndex("by_elderly_user", (q) =>
        q.eq("elderlyUserId", args.elderlyUserId)
      )
      .collect();

    return responses.filter(
      (r) => r.date >= startDate && r.date <= endDate
    );
  },
});

export const getCompletedDates = query({
  args: {
    deviceToken: v.string(),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("elderlyUsers")
      .withIndex("by_device_token", (q) =>
        q.eq("deviceToken", args.deviceToken)
      )
      .unique();

    if (!user) return [];

    const startDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const lastDay = new Date(args.year, args.month, 0).getDate();
    const endDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const responses = await ctx.db
      .query("dailyResponses")
      .withIndex("by_elderly_user", (q) =>
        q.eq("elderlyUserId", user._id)
      )
      .collect();

    return responses
      .filter((r) => r.date >= startDate && r.date <= endDate)
      .map((r) => r.date);
  },
});
