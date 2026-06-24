import { requireAuth } from "@/lib/serverAuth";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { captureException, createRequestId } from "@/lib/logger";
import { ANALYTICS_ROLES } from "@/lib/roles";
import { backendProxyRequest } from "@/lib/backendProxy";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const auth = await requireAuth(ANALYTICS_ROLES);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`analytics:get:${auth.user.id}`, 120, 60_000);
  if (!limiter.ok) return jsonWithHeaders({ error: "Too many requests" }, { status: 429 });

  try {
    const { response, body } = await backendProxyRequest("/api/analytics", { method: "GET" });
    if (!response.ok) {
      const message = body?.message || body?.error || "Failed to fetch analytics";
      return jsonWithHeaders({ error: message }, { status: response.status });
    }

    return jsonWithHeaders(body.data ?? body);
  } catch (err) {
    captureException(err, { route: "GET /api/analytics", requestId, userId: auth.user.id });
    return jsonWithHeaders({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
