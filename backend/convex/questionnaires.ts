import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const questionArgs = {
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
};

export const create = mutation({
  args: {
    elderlyUserId: v.id("elderlyUsers"),
    createdBy: v.id("caregivers"),
    title: v.string(),
    questions: v.array(v.object(questionArgs)),
  },
  handler: async (ctx, args) => {
    const existingActive = await ctx.db
      .query("questionnaires")
      .withIndex("by_elderly_user_active", (q) =>
        q.eq("elderlyUserId", args.elderlyUserId).eq("isActive", true)
      )
      .collect();

    for (const q of existingActive) {
      await ctx.db.patch(q._id, { isActive: false, updatedAt: Date.now() });
    }

    const now = Date.now();
    const questionnaireId = await ctx.db.insert("questionnaires", {
      elderlyUserId: args.elderlyUserId,
      createdBy: args.createdBy,
      title: args.title,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 0; i < args.questions.length; i++) {
      const q = args.questions[i];
      await ctx.db.insert("questions", {
        questionnaireId,
        orderIndex: i,
        imageType: q.imageType,
        imageId: q.imageId,
        imageStorageId: q.imageStorageId,
        altText: q.altText,
        responseType: q.responseType,
        alertThreshold: q.alertThreshold,
      });
    }

    return questionnaireId;
  },
});

export const update = mutation({
  args: {
    questionnaireId: v.id("questionnaires"),
    title: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    questions: v.optional(v.array(v.object(questionArgs))),
  },
  handler: async (ctx, args) => {
    const questionnaire = await ctx.db.get(args.questionnaireId);
    if (!questionnaire) throw new Error("Questionnaire not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;

    if (args.isActive === true) {
      const existingActive = await ctx.db
        .query("questionnaires")
        .withIndex("by_elderly_user_active", (q) =>
          q
            .eq("elderlyUserId", questionnaire.elderlyUserId)
            .eq("isActive", true)
        )
        .collect();
      for (const q of existingActive) {
        if (q._id !== args.questionnaireId) {
          await ctx.db.patch(q._id, { isActive: false, updatedAt: Date.now() });
        }
      }
      updates.isActive = true;
    } else if (args.isActive === false) {
      updates.isActive = false;
    }

    await ctx.db.patch(args.questionnaireId, updates);

    if (args.questions !== undefined) {
      const existingQuestions = await ctx.db
        .query("questions")
        .withIndex("by_questionnaire", (q) =>
          q.eq("questionnaireId", args.questionnaireId)
        )
        .collect();

      for (const q of existingQuestions) {
        await ctx.db.delete(q._id);
      }

      for (let i = 0; i < args.questions.length; i++) {
        const q = args.questions[i];
        await ctx.db.insert("questions", {
          questionnaireId: args.questionnaireId,
          orderIndex: i,
          imageType: q.imageType,
          imageId: q.imageId,
          imageStorageId: q.imageStorageId,
          altText: q.altText,
          responseType: q.responseType,
          alertThreshold: q.alertThreshold,
        });
      }
    }
  },
});

export const get = query({
  args: { questionnaireId: v.id("questionnaires") },
  handler: async (ctx, args) => {
    const questionnaire = await ctx.db.get(args.questionnaireId);
    if (!questionnaire) return null;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_questionnaire", (q) =>
        q.eq("questionnaireId", args.questionnaireId)
      )
      .collect();

    questions.sort((a, b) => a.orderIndex - b.orderIndex);

    const questionsWithUrls = await Promise.all(
      questions.map(async (q) => {
        let imageUrl = null;
        if (q.imageType === "custom" && q.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(q.imageStorageId);
        }
        return { ...q, imageUrl };
      })
    );

    return { ...questionnaire, questions: questionsWithUrls };
  },
});

export const listByCaregiver = query({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const questionnaires = await ctx.db
      .query("questionnaires")
      .withIndex("by_created_by", (q) => q.eq("createdBy", args.caregiverId))
      .collect();

    const results = await Promise.all(
      questionnaires.map(async (questionnaire) => {
        const elderly = await ctx.db.get(questionnaire.elderlyUserId);
        const questions = await ctx.db
          .query("questions")
          .withIndex("by_questionnaire", (q) =>
            q.eq("questionnaireId", questionnaire._id)
          )
          .collect();

        return {
          ...questionnaire,
          elderlyName: elderly?.name ?? "Unknown",
          questionCount: questions.length,
        };
      })
    );

    return results;
  },
});

export const getActiveForElderly = query({
  args: { elderlyUserId: v.id("elderlyUsers") },
  handler: async (ctx, args) => {
    const questionnaire = await ctx.db
      .query("questionnaires")
      .withIndex("by_elderly_user_active", (q) =>
        q.eq("elderlyUserId", args.elderlyUserId).eq("isActive", true)
      )
      .first();

    if (!questionnaire) return null;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_questionnaire", (q) =>
        q.eq("questionnaireId", questionnaire._id)
      )
      .collect();

    questions.sort((a, b) => a.orderIndex - b.orderIndex);

    const questionsWithUrls = await Promise.all(
      questions.map(async (q) => {
        let imageUrl = null;
        if (q.imageType === "custom" && q.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(q.imageStorageId);
        }
        return { ...q, imageUrl };
      })
    );

    return { ...questionnaire, questions: questionsWithUrls };
  },
});

export const remove = mutation({
  args: { questionnaireId: v.id("questionnaires") },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_questionnaire", (q) =>
        q.eq("questionnaireId", args.questionnaireId)
      )
      .collect();

    for (const q of questions) {
      await ctx.db.delete(q._id);
    }

    await ctx.db.delete(args.questionnaireId);
  },
});
