// app/api/prospects/[id]/route.ts — Prisma-backed single prospect endpoint
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildOnboardingChecklistData } from "@/lib/onboarding";
import { mapCardToProspect, toFrontendStage } from "@/lib/api";
import { requireAuth } from "@/lib/serverAuth";
import { validateUpdateProspect } from "@/lib/prospectValidation";

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
  const auth = await requireAuth(["admin", "manager", "agent"]);
  if (!auth.ok) return auth.response;

  try {
    const prospect = await prisma.prospect.findUnique({
      where: { id: params.id },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        checklistItems: { orderBy: { stepNumber: "asc" } },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...mapCardToProspect({ ...prospect, stage: toFrontendStage(prospect.stage) }),
      notes: (prospect.notes || []).map(mapNote),
      checklistItems: (prospect.checklistItems || []).map(mapChecklistItem),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["admin", "manager"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const validated = validateUpdateProspect(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.prospect.findUnique({
        where: { id: params.id },
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
      return next;
    });

    const prospect = await prisma.prospect.findUnique({
      where: { id: params.id },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        checklistItems: { orderBy: { stepNumber: "asc" } },
      },
    });

    return NextResponse.json({
      ...mapCardToProspect({ ...updated, stage: toFrontendStage(updated.stage) }),
      notes: (prospect?.notes || []).map(mapNote),
      checklistItems: (prospect?.checklistItems || []).map(mapChecklistItem),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("PATCH /api/prospects/[id] error:", err);
    return NextResponse.json({ error: "Failed to update prospect" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["admin", "manager"]);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.prospect.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.prospect.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/prospects/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete prospect" }, { status: 500 });
  }
}
