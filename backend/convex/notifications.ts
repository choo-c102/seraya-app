import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getForCaregiver = query({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_caregiver_created", (q) =>
        q.eq("caregiverId", args.caregiverId)
      )
      .order("desc")
      .take(50);

    const results = await Promise.all(
      notifications.map(async (n) => {
        const elderly = await ctx.db.get(n.elderlyUserId);
        return {
          ...n,
          elderlyName: elderly?.name ?? "Unknown",
        };
      })
    );

    return results;
  },
});

export const getUnreadCount = query({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_caregiver_unread", (q) =>
        q.eq("caregiverId", args.caregiverId).eq("isRead", false)
      )
      .collect();
    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllRead = mutation({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_caregiver_unread", (q) =>
        q.eq("caregiverId", args.caregiverId).eq("isRead", false)
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
  },
});
