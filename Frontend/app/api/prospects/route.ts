// app/api/prospects/route.ts — Prisma-backed prospect collection endpoint
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildOnboardingChecklistData } from "@/lib/onboarding";
import { mapCardToProspect, toFrontendStage } from "@/lib/api";
import { requireAuth } from "@/lib/serverAuth";
import { validateCreateProspect } from "@/lib/prospectValidation";

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

export async function GET() {
  const auth = await requireAuth(["admin", "manager", "agent"]);
  if (!auth.ok) return auth.response;

  try {
    const prospects = await prisma.prospect.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
        },
        checklistItems: {
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    return NextResponse.json(
      prospects.map((prospect: any) => {
        const mapped = mapCardToProspect({ ...prospect, stage: toFrontendStage(prospect.stage) });
        return {
          ...mapped,
          notes: (prospect.notes || []).map(mapNote),
          checklistItems: (prospect.checklistItems || []).map(mapChecklistItem),
        };
      })
    );
  } catch (err) {
    console.error("GET /api/prospects error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch prospects";
    const rsaHint = message.includes("allowPublicKeyRetrieval")
      ? "Database auth failed: enable MARIADB_ALLOW_PUBLIC_KEY_RETRIEVAL=true in Backend/.env and restart dev servers."
      : "Failed to fetch prospects";
    return NextResponse.json({ error: rsaHint }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const validated = validateCreateProspect(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const prospect = await tx.prospect.create({
        data: {
          name: validated.data.name,
          school: validated.data.school,
          role: validated.data.role || null,
          email: validated.data.email,
          phone: validated.data.phone || null,
          source: validated.data.source,
          stage: validated.data.stage,
          lastContactDate: validated.data.lastContactDate,
          nextFollowUpDate: validated.data.nextFollowUpDate,
        },
      });

      if (prospect.stage === "Pilot Closed") {
        await tx.onboardingChecklist.createMany({
          data: buildOnboardingChecklistData(prospect.id),
          skipDuplicates: true,
        });
      }

      return prospect;
    });

    const prospect = mapCardToProspect({ ...created, stage: toFrontendStage(created.stage) });
    const fullProspect = await prisma.prospect.findUnique({
      where: { id: created.id },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        checklistItems: { orderBy: { stepNumber: "asc" } },
      },
    });

    return NextResponse.json({
      ...prospect,
      notes: (fullProspect?.notes || []).map(mapNote),
      checklistItems: (fullProspect?.checklistItems || []).map(mapChecklistItem),
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/prospects error:", err);
    return NextResponse.json({ error: "Failed to create prospect" }, { status: 500 });
  }
}
