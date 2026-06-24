import { NextRequest } from "next/server";
import { mapCardToProspect, toBackendStage, toFrontendStage } from "@/lib/api";
import { requireAuth } from "@/lib/serverAuth";
import { validateUpdateProspect } from "@/lib/prospectValidation";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { captureException, createRequestId } from "@/lib/logger";
import { backendProxyRequest } from "@/lib/backendProxy";

function mapNote(note: any) {
  return {
    id: note.id,
    prospectId: note.prospectId,
    content: note.content,
    createdAt: note.createdAt,
  };
}

function mapChecklistItem(item: any) {
  return {
    id: item.id,
    prospectId: item.prospectId,
    stepNumber: item.stepNumber,
    title: item.title,
    description: item.description || "",
    assignee: item.assignee || "",
    status: item.status === "done" ? "DONE" : "TODO",
    dueDate: item.dueDate || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt || item.createdAt,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = createRequestId();
  const auth = await requireAuth(["admin", "manager", "agent"]);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`prospect:get:${auth.user.id}`, 180, 60_000);
  if (!limiter.ok) return jsonWithHeaders({ error: "Too many requests" }, { status: 429 });

  try {
    const { response, body } = await backendProxyRequest(`/api/cards/${params.id}`, { method: "GET" });
    if (!response.ok) {
      const message = body?.message || body?.error || "Not found";
      return jsonWithHeaders({ error: message }, { status: response.status });
    }

    const prospect = body.data;
    return jsonWithHeaders({
      ...mapCardToProspect({ ...prospect, stage: toFrontendStage(prospect.stage) }),
      notes: (prospect.notes || []).map(mapNote),
      checklistItems: (prospect.checklistItems || []).map(mapChecklistItem),
    });
  } catch (err) {
    captureException(err, { route: "GET /api/prospects/[id]", requestId, userId: auth.user.id, prospectId: params.id });
    return jsonWithHeaders({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = createRequestId();
  const auth = await requireAuth(["admin", "manager"]);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`prospect:patch:${auth.user.id}`, 90, 60_000);
  if (!limiter.ok) return jsonWithHeaders({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const validated = validateUpdateProspect(body);
    if (!validated.ok) {
      return jsonWithHeaders({ error: validated.error }, { status: 400 });
    }

    const { response, body: updated } = await backendProxyRequest(`/api/cards/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...validated.data,
        stage: typeof validated.data.stage === "string" ? toBackendStage(validated.data.stage) : validated.data.stage,
      }),
    });

    if (!response.ok) {
      const message = updated?.message || updated?.error || "Failed to update prospect";
      if (response.status === 404) {
        return jsonWithHeaders({ error: "Not found" }, { status: 404 });
      }
      return jsonWithHeaders({ error: message }, { status: response.status });
    }

    const prospect = await backendProxyRequest(`/api/cards/${params.id}`, { method: "GET" });
    const current = prospect.body?.data;
    return jsonWithHeaders({
      ...mapCardToProspect({ ...updated.data, stage: toFrontendStage(updated.data.stage) }),
      notes: (current?.notes || []).map(mapNote),
      checklistItems: (current?.checklistItems || []).map(mapChecklistItem),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return jsonWithHeaders({ error: "Not found" }, { status: 404 });
    }
    captureException(err, { route: "PATCH /api/prospects/[id]", requestId, userId: auth.user.id, prospectId: params.id });
    return jsonWithHeaders({ error: "Failed to update prospect" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = createRequestId();
  const auth = await requireAuth(["admin", "manager"]);
  if (!auth.ok) return auth.response;
  const limiter = applyRateLimit(`prospect:delete:${auth.user.id}`, 30, 60_000);
  if (!limiter.ok) return jsonWithHeaders({ error: "Too many requests" }, { status: 429 });

  try {
    const { response, body } = await backendProxyRequest(`/api/cards/${params.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const message = body?.message || body?.error || "Failed to delete prospect";
      return jsonWithHeaders({ error: message }, { status: response.status });
    }
    return jsonWithHeaders({ success: true });
  } catch (err) {
    captureException(err, { route: "DELETE /api/prospects/[id]", requestId, userId: auth.user.id, prospectId: params.id });
    return jsonWithHeaders({ error: "Failed to delete prospect" }, { status: 500 });
  }
}
