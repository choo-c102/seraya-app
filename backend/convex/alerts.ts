import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getForCaregiver = query({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("caregiverAssignments")
      .withIndex("by_caregiver", (q) => q.eq("caregiverId", args.caregiverId))
      .collect();

    const elderlyIds = assignments.map((a) => a.elderlyUserId);
    const allAlerts = [];

    for (const elderlyId of elderlyIds) {
      const alerts = await ctx.db
        .query("alerts")
        .withIndex("by_elderly_user", (q) => q.eq("elderlyUserId", elderlyId))
        .collect();

      const elderly = await ctx.db.get(elderlyId);

      for (const alert of alerts) {
        allAlerts.push({
          ...alert,
          elderlyName: elderly?.name ?? "Unknown",
        });
      }
    }

    allAlerts.sort((a, b) => b.createdAt - a.createdAt);
    return allAlerts;
  },
});

export const getUnreadForCaregiver = query({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("caregiverAssignments")
      .withIndex("by_caregiver", (q) => q.eq("caregiverId", args.caregiverId))
      .collect();

    let count = 0;
    for (const assignment of assignments) {
      const unread = await ctx.db
        .query("alerts")
        .withIndex("by_elderly_user_unread", (q) =>
          q
            .eq("elderlyUserId", assignment.elderlyUserId)
            .eq("isRead", false)
        )
        .collect();
      count += unread.length;
    }

    return count;
  },
});

export const getForElderlyUser = query({
  args: { elderlyUserId: v.id("elderlyUsers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("alerts")
      .withIndex("by_elderly_user", (q) =>
        q.eq("elderlyUserId", args.elderlyUserId)
      )
      .collect();
  },
});

export const markRead = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { isRead: true });
  },
});

export const markAllRead = mutation({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("caregiverAssignments")
      .withIndex("by_caregiver", (q) => q.eq("caregiverId", args.caregiverId))
      .collect();

    for (const assignment of assignments) {
      const unread = await ctx.db
        .query("alerts")
        .withIndex("by_elderly_user_unread", (q) =>
          q
            .eq("elderlyUserId", assignment.elderlyUserId)
            .eq("isRead", false)
        )
        .collect();

      for (const alert of unread) {
        await ctx.db.patch(alert._id, { isRead: true });
      }
    }
  },
});

export const checkThresholds = internalMutation({
  handler: async (ctx) => {
    const elderlyUsers = await ctx.db.query("elderlyUsers").collect();

    for (const elderly of elderlyUsers) {
      const questionnaire = await ctx.db
        .query("questionnaires")
        .withIndex("by_elderly_user_active", (q) =>
          q.eq("elderlyUserId", elderly._id).eq("isActive", true)
        )
        .first();

      if (!questionnaire) continue;

      const questions = await ctx.db
        .query("questions")
        .withIndex("by_questionnaire", (q) =>
          q.eq("questionnaireId", questionnaire._id)
        )
        .collect();

      for (const question of questions) {
        if (!question.alertThreshold) continue;

        const { value: thresholdValue, consecutiveDays } =
          question.alertThreshold;

        const dates: string[] = [];
        for (let i = 0; i < consecutiveDays; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().split("T")[0]);
        }

        let consecutiveBreaches = 0;
        for (const date of dates) {
          const response = await ctx.db
            .query("dailyResponses")
            .withIndex("by_elderly_user_and_date", (q) =>
              q.eq("elderlyUserId", elderly._id).eq("date", date)
            )
            .first();

          if (!response) break;

          const answer = response.answers.find(
            (a) => a.questionId === question._id
          );
          if (!answer) break;

          if (answer.value <= thresholdValue) {
            consecutiveBreaches++;
          } else {
            break;
          }
        }

        if (consecutiveBreaches >= consecutiveDays) {
          const recentAlert = await ctx.db
            .query("alerts")
            .withIndex("by_elderly_user", (q) =>
              q.eq("elderlyUserId", elderly._id)
            )
            .collect();

          const alreadyAlerted = recentAlert.some(
            (a) =>
              a.questionId === question._id &&
              a.createdAt > Date.now() - 24 * 60 * 60 * 1000
          );

          if (!alreadyAlerted) {
            await ctx.db.insert("alerts", {
              elderlyUserId: elderly._id,
              questionId: question._id,
              alertType: "threshold_breach",
              message: `${question.altText} rated <=${thresholdValue} for ${consecutiveDays} consecutive days.`,
              isRead: false,
              createdAt: Date.now(),
            });

            const assignments = await ctx.db
              .query("caregiverAssignments")
              .withIndex("by_elderly_user", (q) =>
                q.eq("elderlyUserId", elderly._id)
              )
              .collect();

            for (const assignment of assignments) {
              await ctx.db.insert("notifications", {
                caregiverId: assignment.caregiverId,
                elderlyUserId: elderly._id,
                type: "alert",
                title: `Alert: ${elderly.name} — ${question.altText}`,
                message: `${question.altText} rated <=${thresholdValue} for ${consecutiveDays} consecutive days.`,
                isRead: false,
                createdAt: Date.now(),
              });
            }
          }
        }
      }
    }
  },
});
