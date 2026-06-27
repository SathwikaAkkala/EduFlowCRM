import { requireAuth } from "@/lib/serverAuth";
import { backendProxyRequest } from "@/lib/backendProxy";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { captureException, createRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const { response, body } = await backendProxyRequest("/api/notifications", { method: "GET" });

    if (!response.ok) {
      const status = response.status || 500;
      return jsonWithHeaders(
        { error: body?.error || body?.message || "Failed to fetch notifications" },
        { status }
      );
    }

    return jsonWithHeaders({
      success: true,
      data: Array.isArray(body?.data) ? body.data : [],
      unreadCount: Number(body?.unreadCount || 0),
    });
  } catch (err) {
    captureException(err, { route: "GET /api/notifications", requestId, userId: auth.user.id });
    return jsonWithHeaders({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
