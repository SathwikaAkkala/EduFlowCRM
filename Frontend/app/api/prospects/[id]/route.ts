// app/api/prospects/[id]/route.ts — Prisma-backed single prospect endpoint
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { buildOnboardingChecklistData } from "@/lib/onboarding";
import { mapCardToProspect, toFrontendStage } from "@/lib/api";
import { requireAuth } from "@/lib/serverAuth";
import { validateUpdateProspect } from "@/lib/prospectValidation";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { captureException, createRequestId } from "@/lib/logger";

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
    const prospect = await prisma.prospect.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        checklistItems: { orderBy: { stepNumber: "asc" } },
      },
    });

    if (!prospect) {
      return jsonWithHeaders({ error: "Not found" }, { status: 404 });
    }

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

    const updated = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.prospect.findFirst({
        where: { id: params.id, deletedAt: null },
        select: { stage: true },
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      const next = await tx.prospect.update({
        where: { id: params.id },
        data: validated.data,
      });

      if (existing.stage !== "Pilot Closed" && next.stage === "Pilot Closed") {
        await tx.onboardingChecklist.createMany({
          data: buildOnboardingChecklistData(next.id),
          skipDuplicates: true,
        });
      }
      const changedStage = typeof validated.data.stage === "string" && validated.data.stage !== existing.stage;
      if (changedStage) {
        await tx.auditLog.create({
          data: {
            prospectId: params.id,
            action: "STAGE_CHANGED",
            actorId: auth.user.id,
            actorRole: auth.user.role,
            metadata: { from: existing.stage, to: validated.data.stage },
          },
        });
      }
      return next;
    });

    const prospect = await prisma.prospect.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        checklistItems: { orderBy: { stepNumber: "asc" } },
      },
    });

    return jsonWithHeaders({
      ...mapCardToProspect({ ...updated, stage: toFrontendStage(updated.stage) }),
      notes: (prospect?.notes || []).map(mapNote),
      checklistItems: (prospect?.checklistItems || []).map(mapChecklistItem),
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
    const existing = await prisma.prospect.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return jsonWithHeaders({ error: "Not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.prospect.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          prospectId: params.id,
          action: "PROSPECT_ARCHIVED",
          actorId: auth.user.id,
          actorRole: auth.user.role,
        },
      });
    });
    return jsonWithHeaders({ success: true });
  } catch (err) {
    captureException(err, { route: "DELETE /api/prospects/[id]", requestId, userId: auth.user.id, prospectId: params.id });
    return jsonWithHeaders({ error: "Failed to delete prospect" }, { status: 500 });
  }
}
