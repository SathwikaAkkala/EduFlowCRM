import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import { cursorQuerySchema, noteInputSchema } from "@/lib/validation/schemas";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { captureException, createRequestId } from "@/lib/logger";
import { backendProxyRequest } from "@/lib/backendProxy";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = createRequestId();
  const auth = await requireAuth(["admin", "manager", "agent"]);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`notes:get:${auth.user.id}`, 180, 60_000);
  if (!limiter.ok) return jsonWithHeaders({ error: "Too many requests" }, { status: 429 });

  try {
    const parsedQuery = cursorQuerySchema.safeParse({
      cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) {
      return jsonWithHeaders({ error: parsedQuery.error.issues[0]?.message ?? "Invalid query" }, { status: 400 });
    }
    const { limit, cursor } = parsedQuery.data;
    const { response, body } = await backendProxyRequest(
      `/api/cards/${params.id}/notes?page=1&limit=${limit}&cursor=${cursor ?? ""}`,
      { method: "GET" }
    );
    if (!response.ok) {
      const message = body?.message || body?.error || "Failed to fetch notes";
      return jsonWithHeaders({ error: message }, { status: response.status });
    }

    const notes = Array.isArray(body?.data) ? body.data : [];

    return jsonWithHeaders({
      data: notes.map((note: { id: string; prospectId: string; content: string; createdAt: string | Date }) => ({
        id: note.id,
        prospectId: note.prospectId,
        content: note.content,
        createdAt: note.createdAt,
      })),
      pagination: {
        nextCursor: null,
        hasMore: false,
      },
    });
  } catch (err) {
    captureException(err, { route: "GET /api/prospects/[id]/notes", requestId, userId: auth.user.id, prospectId: params.id });
    return jsonWithHeaders({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = createRequestId();
  const auth = await requireAuth(["admin", "manager", "agent"]);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`notes:post:${auth.user.id}`, 120, 60_000);
  if (!limiter.ok) return jsonWithHeaders({ error: "Too many requests" }, { status: 429 });

  try {
    const parsed = noteInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonWithHeaders({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const normalizedContent = parsed.data.content;
    const { response, body } = await backendProxyRequest(`/api/cards/${params.id}/notes`, {
      method: "POST",
      body: JSON.stringify({ content: normalizedContent }),
    });

    if (!response.ok) {
      const message = body?.message || body?.error || "Failed to add note";
      return jsonWithHeaders({ error: message }, { status: response.status });
    }

    return jsonWithHeaders(body, { status: 201 });
  } catch (err) {
    captureException(err, { route: "POST /api/prospects/[id]/notes", requestId, userId: auth.user.id, prospectId: params.id });
    return jsonWithHeaders({ error: "Failed to add note" }, { status: 500 });
  }
}
