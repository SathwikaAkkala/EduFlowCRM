import { useEffect, useState, useCallback } from "react";
import { apiCall } from "@/lib/api";

export type NotificationItem = {
  id: string;
  read?: boolean;
  type?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  metadata?: {
    prospectIds?: string[];
  };
};

type NotificationsResponse = {
  success: boolean;
  data?: NotificationItem[];
  unreadCount?: number;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });
      const response = (await res.json()) as NotificationsResponse;

      if (res.ok && response.success) {
        setNotifications(response.data || []);
        setUnreadCount(response.unreadCount || 0);
      } else {
        throw new Error(response?.error || "Unable to fetch notifications");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to fetch notifications";
      console.error("Error fetching notifications:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const response = (await apiCall(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      })) as NotificationsResponse;

      if (!response.success) {
        // Keep the optimistic UI change even if the backend log entry doesn't exist.
        console.warn("Notification read update returned a non-success response");
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }, []);

  // Fetch unread count periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = (await apiCall("/notifications/unread-count", {
        method: "GET",
      })) as NotificationsResponse;

      if (response.success) {
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, []);

  // Poll the full list so new bell items appear without a manual refresh.
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    fetchUnreadCount,
  };
}
