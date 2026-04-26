import { QueryCtx, MutationCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

export async function getCaregiver(
  ctx: QueryCtx | MutationCtx,
  caregiverId: Id<"caregivers">
): Promise<Doc<"caregivers">> {
  const caregiver = await ctx.db.get(caregiverId);
  if (!caregiver) {
    throw new Error("Caregiver not found");
  }
  return caregiver;
}

export async function getElderlyByDeviceToken(
  ctx: QueryCtx | MutationCtx,
  deviceToken: string
): Promise<Doc<"elderlyUsers">> {
  const user = await ctx.db
    .query("elderlyUsers")
    .withIndex("by_device_token", (q) => q.eq("deviceToken", deviceToken))
    .unique();
  if (!user) {
    throw new Error("Elderly user not found");
  }
  return user;
}

export async function verifyCaregiverAssignment(
  ctx: QueryCtx | MutationCtx,
  caregiverId: Id<"caregivers">,
  elderlyUserId: Id<"elderlyUsers">
): Promise<boolean> {
  const assignment = await ctx.db
    .query("caregiverAssignments")
    .withIndex("by_caregiver_and_elderly", (q) =>
      q.eq("caregiverId", caregiverId).eq("elderlyUserId", elderlyUserId)
    )
    .unique();
  return assignment !== null;
}

export const authenticateElderly = query({
  args: {
    deviceToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("elderlyUsers")
      .withIndex("by_device_token", (q) =>
        q.eq("deviceToken", args.deviceToken)
      )
      .unique();

    if (!user) {
      return null;
    }

    const questionnaire = await ctx.db
      .query("questionnaires")
      .withIndex("by_elderly_user_active", (q) =>
        q.eq("elderlyUserId", user._id).eq("isActive", true)
      )
      .first();

    return {
      user,
      questionnaire,
    };
  },
});
