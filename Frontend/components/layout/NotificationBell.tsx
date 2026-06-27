"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, X, Check } from "lucide-react";
import { type NotificationItem, useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const getNotificationIcon = (type: string | undefined) => {
    switch (type) {
      case "overdue_prospects":
        return "🔴";
      case "milestone":
        return "🎉";
      case "alert":
        return "⚠️";
      default:
        return "📢";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 inline-flex -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed right-4 top-16 z-50 w-[calc(100vw-2rem)] max-w-80 rounded-lg border border-gray-200 bg-white shadow-xl sm:right-6 md:top-20">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 transition-colors hover:bg-gray-100"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications && notifications.length > 0 ? (
              notifications.map((notification: NotificationItem) => {
                const createdAt = notification.createdAt || new Date().toISOString();

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "border-b border-gray-100 p-4 transition-colors hover:bg-gray-50",
                      !notification.read && "bg-blue-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{notification.title}</h4>
                        <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(createdAt).toLocaleDateString()} at{" "}
                          {new Date(createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="rounded p-1 transition-colors hover:bg-gray-200"
                          title="Mark as read"
                        >
                          <Check size={16} className="text-blue-600" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            )}
          </div>

          {notifications && notifications.length > 0 && (
            <div className="border-t border-gray-200 p-3 text-center">
              <Link href="/notifications" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all notifications &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
