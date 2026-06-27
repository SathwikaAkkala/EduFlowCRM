import { describe, expect, it, vi, beforeEach } from "vitest";

const { notificationServiceMock } = vi.hoisted(() => ({
  notificationServiceMock: {
    getUserNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
    checkAndNotifyOverdueProspects: vi.fn(),
  },
}));

vi.mock("../../../Backend/src/service/notification.service.js", () => notificationServiceMock);

import { markAsRead } from "../../../Backend/src/controllers/notification.controller.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notification controller", () => {
  it("PATCH /api/notifications/:id marks the notification as read and returns the updated record", async () => {
    const req = {
      params: { id: "notif-1" },
    } as any;

    const json = vi.fn();
    const res = {
      json,
    } as any;
    const next = vi.fn();

    notificationServiceMock.markNotificationAsRead.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      type: "prospect_updated",
      title: "Updated",
      message: "Done",
      read: true,
      createdAt: new Date("2026-06-27T08:00:00.000Z"),
    });

    await markAsRead(req, res, next);

    expect(notificationServiceMock.markNotificationAsRead).toHaveBeenCalledWith("notif-1");
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        id: "notif-1",
        read: true,
      }),
    });
    expect(next).not.toHaveBeenCalled();
  });
});
