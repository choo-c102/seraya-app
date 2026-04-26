import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "hash_" + Math.abs(hash).toString(36) + "_" + password.length;
}

export const create = mutation({
  args: {
    orgName: v.string(),
    caregiverName: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("caregivers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      throw new Error("Email already registered");
    }

    const caregiverId = await ctx.db.insert("caregivers", {
      name: args.caregiverName,
      email: args.email,
      passwordHash: simpleHash(args.password),
      organizationId: "" as any,
      createdAt: Date.now(),
    });

    const orgId = await ctx.db.insert("organizations", {
      name: args.orgName,
      createdBy: caregiverId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(caregiverId, { organizationId: orgId });

    return { organizationId: orgId, caregiverId };
  },
});

export const get = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});
