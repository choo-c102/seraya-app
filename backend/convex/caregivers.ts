import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getProfile = query({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const caregiver = await ctx.db.get(args.caregiverId);
    if (!caregiver) return null;
    const { passwordHash: _, ...profile } = caregiver;
    return profile;
  },
});

export const updatePushToken = mutation({
  args: {
    caregiverId: v.id("caregivers"),
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.caregiverId, { pushToken: args.pushToken });
  },
});

export const updateLanguage = mutation({
  args: {
    caregiverId: v.id("caregivers"),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.caregiverId, { language: args.language });
  },
});

export const createInviteLink = mutation({
  args: {
    caregiverId: v.id("caregivers"),
  },
  handler: async (ctx, args) => {
    const caregiver = await ctx.db.get(args.caregiverId);
    if (!caregiver) throw new Error("Caregiver not found");

    const token =
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2) +
      Date.now().toString(36);

    const inviteId = await ctx.db.insert("inviteLinks", {
      organizationId: caregiver.organizationId,
      createdBy: args.caregiverId,
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return { token, inviteId };
  },
});

export const getInviteInfo = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("inviteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) return null;
    if (invite.expiresAt < Date.now()) return null;
    if (invite.usedBy) return null;

    const org = await ctx.db.get(invite.organizationId);
    return {
      organizationName: org?.name ?? "Unknown",
      organizationId: invite.organizationId,
    };
  },
});
