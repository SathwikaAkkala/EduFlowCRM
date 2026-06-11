import prisma from "../db/prismaClient.js";
import {
  sendOverdueNotificationEmail,
  sendProspectOverdueReminderEmail,
} from "./email.service.js";

/**
 * Check for overdue prospects and send notifications to all users
 * @returns {Promise<object>} Summary of notifications sent
 */
export const checkAndNotifyOverdueProspects = async () => {
  try {
    console.log("[Notification Service] Starting overdue prospect check...");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const cooldownHours = Number(process.env.NOTIFICATION_COOLDOWN_HOURS || 24);
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - cooldownMs);

    // Find all overdue prospects (active ones only) and include owner if set.
    // Cooldown prevents resending overdue emails repeatedly.
    const overdueProspects = await prisma.prospect.findMany({
      where: {
        deletedAt: null,
        stage: { not: "Pilot Closed" },
        nextFollowUpDate: { lt: startOfToday },
        OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: cutoff } }],
      },
      select: {
        id: true,
        name: true,
        school: true,
        stage: true,
        email: true,
        nextFollowUpDate: true,
        ownerId: true,
        owner: { select: { id: true, email: true, name: true, role: true } },
      },
    });

    if (overdueProspects.length === 0) {
      console.log("[Notification Service] No overdue prospects found.");
      return { success: true, count: 0, message: "No overdue prospects" };
    }

    console.log(`[Notification Service] Found ${overdueProspects.length} overdue prospect(s)`);

    let prospectEmailsSent = 0;
    let prospectEmailsFailed = 0;

    // First: email prospects directly if they have an email and update their lastNotifiedAt
    for (const p of overdueProspects) {
      if (p.email) {
        try {
          const res = await sendProspectOverdueReminderEmail(p.email, p);
          if (res.success) {
            await prisma.prospect.update({ where: { id: p.id }, data: { lastNotifiedAt: new Date() } });
            prospectEmailsSent++;
          } else {
            prospectEmailsFailed++;
            console.error(`[Notification Service] Failed to send email to prospect ${p.email}: ${res.error}`);
          }
        } catch (err) {
          prospectEmailsFailed++;
          console.error(`[Notification Service] Error sending email to prospect ${p.email}:`, err.message);
        }
      }
    }

    // Group prospects by ownerId; unassigned ones go to 'UNASSIGNED'
    const byOwner = overdueProspects.reduce((map, p) => {
      const key = p.ownerId || "UNASSIGNED";
      if (!map[key]) map[key] = [];
      map[key].push(p);
      return map;
    }, {});

    // Fetch admins once (for unassigned fallback)
    const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true, email: true, name: true } });

    let sentCount = 0;
    let failedCount = 0;

    // Notify each owner (or admins for unassigned)
    for (const [ownerId, prospects] of Object.entries(byOwner)) {
      if (ownerId === "UNASSIGNED") {
        // Notify all admins about unassigned overdue prospects
        for (const admin of admins) {
          try {
            const result = await sendOverdueNotificationEmail(admin.email, prospects);
            if (result.success) {
              await prisma.notificationLog.create({
                data: {
                  userId: admin.id,
                  type: "overdue_prospects",
                  title: `${prospects.length} Unassigned Overdue Follow-ups`,
                  message: `There are ${prospects.length} unassigned prospect(s) with overdue follow-up dates.`,
                  metadata: { prospectCount: prospects.length, prospectIds: prospects.map((p) => p.id) },
                  read: false,
                },
              });

              // Update cooldown marker for ALL prospects included in this email
              await prisma.prospect.updateMany({
                where: { id: { in: prospects.map((p) => p.id) } },
                data: { lastNotifiedAt: new Date() },
              });

              sentCount++;
            } else {
              failedCount++;
              console.error(`[Notification Service] Failed to send email to admin ${admin.email}: ${result.error}`);
            }
          } catch (error) {
            failedCount++;
            console.error(`[Notification Service] Error notifying admin ${admin.id}:`, error.message);
          }
        }
      } else {
        // Notify the owner directly
        const owner = prospects[0].owner;
        if (!owner) {
          // fallback to admins if owner missing
          for (const admin of admins) {
            try {
              const result = await sendOverdueNotificationEmail(admin.email, prospects);
              if (result.success) {
                await prisma.notificationLog.create({
                  data: {
                    userId: admin.id,
                    type: "overdue_prospects",
                    title: `${prospects.length} Overdue Follow-ups (missing owner)`,
                    message: `There are ${prospects.length} prospect(s) with overdue follow-up dates but the owner is missing.`,
                    metadata: { prospectCount: prospects.length, prospectIds: prospects.map((p) => p.id) },
                    read: false,
                  },
                });

                // Update cooldown marker for ALL prospects included in this email
                await prisma.prospect.updateMany({
                  where: { id: { in: prospects.map((p) => p.id) } },
                  data: { lastNotifiedAt: new Date() },
                });

                sentCount++;
              } else {
                failedCount++;
                console.error(`[Notification Service] Failed to send email to admin ${admin.email}: ${result.error}`);
              }
            } catch (error) {
              failedCount++;
              console.error(`[Notification Service] Error notifying admin ${admin.id}:`, error.message);
            }
          }
        } else {
          try {
            const result = await sendOverdueNotificationEmail(owner.email, prospects);
            if (result.success) {
              await prisma.notificationLog.create({
                data: {
                  userId: owner.id,
                  type: "overdue_prospects",
                  title: `${prospects.length} Overdue Follow-ups`,
                  message: `You have ${prospects.length} prospect(s) with overdue follow-up dates.`,
                  metadata: { prospectCount: prospects.length, prospectIds: prospects.map((p) => p.id) },
                  read: false,
                },
              });

              // Update cooldown marker for ALL prospects included in this email
              await prisma.prospect.updateMany({
                where: { id: { in: prospects.map((p) => p.id) } },
                data: { lastNotifiedAt: new Date() },
              });

              sentCount++;
            } else {
              failedCount++;
              console.error(`[Notification Service] Failed to send email to ${owner.email}: ${result.error}`);
            }
          } catch (error) {
            failedCount++;
            console.error(`[Notification Service] Error notifying owner ${owner.id}:`, error.message);
          }
        }
      }
    }

    console.log(
      `[Notification Service] Notification cycle complete. Prospect emails sent: ${prospectEmailsSent}, failed: ${prospectEmailsFailed}. Internal notifications sent: ${sentCount}, failed: ${failedCount}`
    );

    return {
      success: true,
      overdueProspectsFound: overdueProspects.length,
      prospectEmailsSent,
      prospectEmailsFailed,
      emailsSent: sentCount,
      emailsFailed: failedCount,
      usersNotified: sentCount,
    };
  } catch (error) {
    console.error("[Notification Service] Error in checkAndNotifyOverdueProspects:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get unread notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of notifications
 */
export const getUserNotifications = async (userId) => {
  try {
    const notifications = await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50
    });

    return notifications;
  } catch (error) {
    console.error("[Notification Service] Error fetching user notifications:", error.message);
    return [];
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object>} Updated notification
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notification = await prisma.notificationLog.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return notification;
  } catch (error) {
    console.error("[Notification Service] Error marking notification as read:", error.message);
    throw error;
  }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
export const getUnreadCount = async (userId) => {
  try {
    const count = await prisma.notificationLog.count({
      where: { userId, read: false },
    });

    return count;
  } catch (error) {
    console.error("[Notification Service] Error getting unread count:", error.message);
    return 0;
  }
};

export default {
  checkAndNotifyOverdueProspects,
  getUserNotifications,
  markNotificationAsRead,
  getUnreadCount,
};
