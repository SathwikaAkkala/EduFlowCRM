import {
  getUserNotifications,
  markNotificationAsRead,
  getUnreadCount,
  checkAndNotifyOverdueProspects,
  syncBellNotificationsForUser,
} from "../service/notification.service.js";

/**
 * GET /api/notifications - Get all notifications for the authenticated user
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await syncBellNotificationsForUser(req.user);
    const notifications = await getUserNotifications(userId);
    const unreadCount = await getUnreadCount(userId);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count - Get unread notification count
 */
export const getUnreadCountEndpoint = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await syncBellNotificationsForUser(req.user);
    const count = await getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id - Mark a notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await markNotificationAsRead(id);

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications/trigger-overdue-check - Manually trigger overdue check (admin only)
 */
export const triggerOverdueCheckEndpoint = async (req, res, next) => {
  try {
    // Check if user is admin (optional - add role check if needed)
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only admins can trigger manual checks",
      });
    }

    const result = await checkAndNotifyOverdueProspects();

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getNotifications,
  getUnreadCountEndpoint,
  markAsRead,
  triggerOverdueCheckEndpoint,
};
