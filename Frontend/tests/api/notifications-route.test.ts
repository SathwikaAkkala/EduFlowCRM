import { describe, expect, it, vi, beforeEach } from "vitest";

const { requireAuthMock, backendProxyRequestMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  backendProxyRequestMock: vi.fn(),
}));

vi.mock("@/lib/serverAuth", () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock("@/lib/backendProxy", () => ({
  backendProxyRequest: (...args: unknown[]) => backendProxyRequestMock(...args),
}));

import { GET } from "@/app/api/notifications/route";

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthMock.mockResolvedValue({
    ok: true as const,
    user: { id: "u1", role: "admin", email: "admin@example.com", name: "Admin" },
    token: "t",
  });
});

describe("notifications api route", () => {
  it("returns persisted notifications only and does not synthesize unread items", async () => {
    backendProxyRequestMock.mockResolvedValueOnce({
      response: new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: "n1",
              type: "prospect_updated",
              title: "Updated",
              message: "Saved in Prisma",
              read: true,
              createdAt: "2026-06-27T08:00:00.000Z",
            },
          ],
          unreadCount: 0,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      ),
      body: {
        success: true,
        data: [
          {
            id: "n1",
            type: "prospect_updated",
            title: "Updated",
            message: "Saved in Prisma",
            read: true,
            createdAt: "2026-06-27T08:00:00.000Z",
          },
        ],
        unreadCount: 0,
      },
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(backendProxyRequestMock).toHaveBeenCalledTimes(1);
    expect(body.success).toBe(true);
    expect(body.unreadCount).toBe(0);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("n1");
    expect(body.data[0].read).toBe(true);
  });
});
