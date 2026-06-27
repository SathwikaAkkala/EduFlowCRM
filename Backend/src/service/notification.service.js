import prisma from "../db/prismaClient.js";
import {
  sendOverdueNotificationEmail,
  sendProspectOverdueReminderEmail,
} from "./email.service.js";

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const getAdminUsers = async (client = prisma) => {
  return client.user.findMany({
    where: { role: "admin" },
    select: { id: true, email: true, name: true, role: true },
  });
};

export const createNotificationLogs = async (client, recipients, payload) => {
  const uniqueRecipients = [...new Map(recipients.filter(Boolean).map((user) => [user.id, user])).values()];
  if (uniqueRecipients.length === 0) return [];

  return Promise.all(
    uniqueRecipients.map((user) =>
      client.notificationLog.create({
        data: {
          userId: user.id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          metadata: payload.metadata ?? undefined,
          read: false,
        },
      })
    )
  );
};

export const getProspectNotificationRecipients = async (client, prospect, actorUser) => {
  const recipients = [];
  const seen = new Set();

  const addRecipient = (user) => {
    if (!user?.id || seen.has(user.id)) return;
    seen.add(user.id);
    recipients.push(user);
  };

  addRecipient(actorUser);

  if (prospect?.owner) {
    addRecipient(prospect.owner);
  } else {
    const admins = await getAdminUsers(client);
    admins.forEach(addRecipient);
  }

  return recipients;
};

const formatFieldLabel = (field) => {
  const labels = {
    name: "name",
    school: "school",
    role: "role",
    email: "email",
    phone: "phone",
    source: "source",
    stage: "stage",
    lastContactDate: "last contact date",
    nextFollowUpDate: "follow-up date",
    completed: "completion status",
    completedAt: "completion time",
  };
  return labels[field] || field;
};

const formatDateValue = (value) => {
  if (!value) return "cleared";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

const describeChange = (field, before, after) => {
  if (field === "lastContactDate" || field === "nextFollowUpDate" || field === "completedAt") {
    return `${formatFieldLabel(field)} changed from ${formatDateValue(before)} to ${formatDateValue(after)}`;
  }

  return `${formatFieldLabel(field)} changed from "${before ?? "empty"}" to "${after ?? "empty"}"`;
};

const valuesEqual = (field, before, after) => {
  if (field === "lastContactDate" || field === "nextFollowUpDate" || field === "completedAt") {
    const beforeTime = before ? new Date(before).getTime() : null;
    const afterTime = after ? new Date(after).getTime() : null;
    return beforeTime === afterTime;
  }

  return before === after;
};

export const checkAndNotifyOverdueProspects = async () => {
  try {
    console.log("[Notification Service] Starting overdue prospect check...");

    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const cooldownHours = Number(process.env.NOTIFICATION_COOLDOWN_HOURS || 24);
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - cooldownMs);

    const baseSelect = {
      id: true,
      name: true,
      school: true,
      stage: true,
      email: true,
      nextFollowUpDate: true,
      ownerId: true,
      owner: { select: { id: true, email: true, name: true, role: true } },
    };

    const overdueProspects = await prisma.prospect.findMany({
      where: {
        deletedAt: null,
        stage: { not: "Pilot Closed" },
        nextFollowUpDate: { lt: todayStart },
        OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: cutoff } }],
      },
      select: baseSelect,
    });

    const dueTodayProspects = await prisma.prospect.findMany({
      where: {
        deletedAt: null,
        stage: { not: "Pilot Closed" },
        nextFollowUpDate: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      select: baseSelect,
    });

    let prospectEmailsSent = 0;
    let prospectEmailsFailed = 0;
    let internalNotificationsSent = 0;
    let internalNotificationsFailed = 0;

    const markProspectsAsNotified = async (prospectIds) => {
      const uniqueIds = [...new Set(prospectIds)].filter(Boolean);
      if (uniqueIds.length === 0) return;

      await prisma.prospect.updateMany({
        where: { id: { in: uniqueIds } },
        data: { lastNotifiedAt: new Date() },
      });
    };

    const notifyOwnerGroups = async (prospects, type, titleForOwner, titleForAdmins, messageForOwner, messageForAdmins) => {
      if (prospects.length === 0) return { sent: 0, failed: 0, prospectIds: [] };

      const prospectIds = prospects.map((p) => p.id);
      const groups = prospects.reduce((map, prospect) => {
        const key = prospect.ownerId || "UNASSIGNED";
        if (!map[key]) map[key] = [];
        map[key].push(prospect);
        return map;
      }, {});

      let sent = 0;
      let failed = 0;

      for (const [ownerId, groupProspects] of Object.entries(groups)) {
        const owner = groupProspects[0].owner;
        const recipients =
          ownerId === "UNASSIGNED" || !owner
            ? await getAdminUsers()
            : [owner];

        for (const recipient of recipients) {
          const existingToday =
            type === "due_today"
              ? await prisma.notificationLog.findFirst({
                  where: {
                    userId: recipient.id,
                    type,
                    createdAt: { gte: todayStart },
                  },
                })
              : null;

          if (existingToday) continue;

          try {
            await prisma.notificationLog.create({
              data: {
                userId: recipient.id,
                type,
                title:
                  recipient.role === "admin" && titleForAdmins
                    ? titleForAdmins(groupProspects)
                    : titleForOwner(groupProspects),
                message:
                  recipient.role === "admin" && messageForAdmins
                    ? messageForAdmins(groupProspects)
                    : messageForOwner(groupProspects),
                metadata: { prospectCount: groupProspects.length, prospectIds: groupProspects.map((p) => p.id) },
                read: false,
              },
            });
            sent++;
          } catch (error) {
            failed++;
            console.error(`[Notification Service] Failed to create ${type} notification for ${recipient.id}:`, error.message);
          }
        }
      }

      return { sent, failed, prospectIds };
    };

    for (const prospect of overdueProspects) {
      if (!prospect.email) continue;
      try {
        const res = await sendProspectOverdueReminderEmail(prospect.email, prospect);
        if (res.success) {
          prospectEmailsSent++;
        } else {
          prospectEmailsFailed++;
          console.error(`[Notification Service] Failed to send email to prospect ${prospect.email}: ${res.error}`);
        }
      } catch (err) {
        prospectEmailsFailed++;
        console.error(`[Notification Service] Error sending email to prospect ${prospect.email}:`, err.message);
      }
    }

    const overdueResult = await notifyOwnerGroups(
      overdueProspects,
      "overdue_prospects",
      (group) => `${group.length} Overdue Follow-ups`,
      (group) => `${group.length} Overdue Follow-ups`,
      (group) => `You have ${group.length} prospect(s) with overdue follow-up dates.`,
      (group) => `There are ${group.length} prospect(s) with overdue follow-up dates.`
    );
    internalNotificationsSent += overdueResult.sent;
    internalNotificationsFailed += overdueResult.failed;

    await markProspectsAsNotified(overdueResult.prospectIds);

    const dueTodayResult = await notifyOwnerGroups(
      dueTodayProspects,
      "due_today",
      (group) => `${group.length} Due Today Follow-ups`,
      (group) => `${group.length} Due Today Follow-ups`,
      (group) => `You have ${group.length} prospect(s) due for follow-up today.`,
      (group) => `There are ${group.length} prospect(s) due for follow-up today.`
    );
    internalNotificationsSent += dueTodayResult.sent;
    internalNotificationsFailed += dueTodayResult.failed;

    console.log(
      `[Notification Service] Notification cycle complete. Prospect emails sent: ${prospectEmailsSent}, failed: ${prospectEmailsFailed}. Internal notifications sent: ${internalNotificationsSent}, failed: ${internalNotificationsFailed}`
    );

    return {
      success: true,
      overdueProspectsFound: overdueProspects.length,
      dueTodayProspectsFound: dueTodayProspects.length,
      prospectEmailsSent,
      prospectEmailsFailed,
      emailsSent: internalNotificationsSent,
      emailsFailed: internalNotificationsFailed,
      usersNotified: internalNotificationsSent,
    };
  } catch (error) {
    console.error("[Notification Service] Error in checkAndNotifyOverdueProspects:", error.message);
    return { success: false, error: error.message };
  }
};

export const getUserNotifications = async (userId) => {
  try {
    const notifications = await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return notifications;
  } catch (error) {
    console.error("[Notification Service] Error fetching user notifications:", error.message);
    return [];
  }
};

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

export const syncBellNotificationsForUser = async (user) => {
  try {
    if (!user?.id) {
      return { success: false, error: "Missing user" };
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const isAdmin = user.role === "admin";
    const prospectScope = isAdmin ? {} : { ownerId: user.id };

    const overdueProspects = await prisma.prospect.findMany({
      where: {
        deletedAt: null,
        stage: { not: "Pilot Closed" },
        nextFollowUpDate: { lt: todayStart },
        ...prospectScope,
      },
      select: {
        id: true,
        name: true,
        school: true,
        stage: true,
        nextFollowUpDate: true,
        ownerId: true,
      },
    });

    const dueTodayProspects = await prisma.prospect.findMany({
      where: {
        deletedAt: null,
        stage: { not: "Pilot Closed" },
        nextFollowUpDate: {
          gte: todayStart,
          lt: tomorrowStart,
        },
        ...prospectScope,
      },
      select: {
        id: true,
        name: true,
        school: true,
        stage: true,
        nextFollowUpDate: true,
        ownerId: true,
      },
    });

    const ensureSummary = async (type, prospects, title, message) => {
      if (prospects.length === 0) return null;

      const existing = await prisma.notificationLog.findFirst({
        where: {
          userId: user.id,
          type,
          createdAt: { gte: todayStart },
        },
      });

      const metadata = {
        prospectCount: prospects.length,
        prospectIds: prospects.map((p) => p.id),
      };

      if (existing) {
        return prisma.notificationLog.update({
          where: { id: existing.id },
          data: {
            title,
            message,
            metadata,
            read: false,
          },
        });
      }

      return prisma.notificationLog.create({
        data: {
          userId: user.id,
          type,
          title,
          message,
          metadata,
          read: false,
        },
      });
    };

    const results = await Promise.all([
      ensureSummary(
        "overdue_prospects",
        overdueProspects,
        `${overdueProspects.length} Overdue Follow-ups`,
        isAdmin
          ? `There are ${overdueProspects.length} prospect(s) with overdue follow-up dates.`
          : `You have ${overdueProspects.length} prospect(s) with overdue follow-up dates.`
      ),
      ensureSummary(
        "due_today",
        dueTodayProspects,
        `${dueTodayProspects.length} Due Today Follow-ups`,
        isAdmin
          ? `There are ${dueTodayProspects.length} prospect(s) due for follow-up today.`
          : `You have ${dueTodayProspects.length} prospect(s) due for follow-up today.`
      ),
    ]);

    return {
      success: true,
      overdueProspects: overdueProspects.length,
      dueTodayProspects: dueTodayProspects.length,
      created: results.filter(Boolean).length,
    };
  } catch (error) {
    console.error("[Notification Service] Error syncing bell notifications:", error.message);
    return { success: false, error: error.message };
  }
};

export default {
  checkAndNotifyOverdueProspects,
  getUserNotifications,
  markNotificationAsRead,
  getUnreadCount,
  syncBellNotificationsForUser,
};
