import { NextRequest } from "next/server";
import { mapCardToProspect, toBackendStage, toFrontendStage } from "@/lib/api";
import { requireAuth } from "@/lib/serverAuth";
import { validateCreateProspect } from "@/lib/prospectValidation";
import { cursorQuerySchema, prospectFieldsSchema } from "@/lib/validation/schemas";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { captureException, createRequestId, log } from "@/lib/logger";
import { PROSPECT_EDIT_ROLES, PROSPECT_VIEW_ROLES } from "@/lib/roles";
import { backendProxyRequest } from "@/lib/backendProxy";

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await requireAuth(PROSPECT_VIEW_ROLES);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`prospects:get:${auth.user.id}`, 120, 60_000);
  if (!limiter.ok) {
    return jsonWithHeaders({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": `${limiter.retryAfterSeconds}` } });
  }

  try {
    const parsedQuery = cursorQuerySchema.safeParse({
      cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) {
      return jsonWithHeaders({ error: parsedQuery.error.issues[0]?.message ?? "Invalid query" }, { status: 400 });
    }
    const fieldsMode = prospectFieldsSchema.parse(req.nextUrl.searchParams.get("fields") ?? "full");
    const { limit } = parsedQuery.data;
    void parsedQuery.data.cursor;

    const pageSize = Math.max(limit, 100);
    const groupedCards: any[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const { response, body } = await backendProxyRequest(`/api/cards?page=${page}&limit=${pageSize}`, {
        method: "GET",
      });

      if (!response.ok) {
        const message = body?.message || body?.error || "Failed to fetch prospects";
        return jsonWithHeaders({ error: message }, { status: response.status });
      }

      groupedCards.push(...(Array.isArray(body?.data) ? body.data : []));
      totalPages = Number(body?.pagination?.totalPages || totalPages);
      page += 1;
    }

    const data = groupedCards.flatMap((group: any) =>
      (group.prospects || []).map((card: any) =>
        mapCardToProspect({ ...card, stage: card.stage ?? group._id })
      )
    );
    data.sort(
      (left: any, right: any) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
        String(right.id).localeCompare(String(left.id))
    );
    log("info", "Prospects fetched", { requestId, userId: auth.user.id, count: data.length, fieldsMode });
    return jsonWithHeaders({
      data,
      pagination: {
        nextCursor: null,
        hasMore: false,
      },
    });
  } catch (err) {
    captureException(err, { route: "GET /api/prospects", requestId, userId: auth.user.id });
    const message = err instanceof Error ? err.message : "Failed to fetch prospects";
    const rsaHint = message.includes("allowPublicKeyRetrieval")
      ? "Database auth failed: enable MARIADB_ALLOW_PUBLIC_KEY_RETRIEVAL=true in Backend/.env and restart dev servers."
      : message;
    const errorMessage = process.env.NODE_ENV === "development" ? rsaHint : "Failed to fetch prospects";
    return jsonWithHeaders({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await requireAuth(PROSPECT_EDIT_ROLES);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`prospects:post:${auth.user.id}`, 60, 60_000);
  if (!limiter.ok) {
    return jsonWithHeaders({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": `${limiter.retryAfterSeconds}` } });
  }

  try {
    const body = await req.json();
    const validated = validateCreateProspect(body);
    if (!validated.ok) {
      return jsonWithHeaders({ error: validated.error }, { status: 400 });
    }

    const { response, body: created } = await backendProxyRequest("/api/cards", {
      method: "POST",
      body: JSON.stringify({
        ...validated.data,
        stage: validated.data.stage ? toBackendStage(validated.data.stage) : undefined,
      }),
    });

    if (!response.ok) {
      const message = created?.message || created?.error || "Failed to create prospect";
      return jsonWithHeaders({ error: message }, { status: response.status });
    }

    const prospect = mapCardToProspect({ ...created.data, stage: toFrontendStage(created.data.stage) });
    return jsonWithHeaders({ ...prospect, notes: [], checklistItems: [] }, { status: 201 });
  } catch (err) {
    captureException(err, { route: "POST /api/prospects", requestId, userId: auth.user.id });
    return jsonWithHeaders({ error: "Failed to create prospect" }, { status: 500 });
  }
}
