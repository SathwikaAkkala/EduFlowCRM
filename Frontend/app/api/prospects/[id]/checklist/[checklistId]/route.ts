// app/api/prospects/[id]/checklist/[checklistId]/route.ts — Prisma-backed checklist endpoint
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; checklistId: string } }
) {
  const auth = await requireAuth(["admin", "manager"]);
  if (!auth.ok) return auth.response;

  try {
    const { status } = await req.json();
    if (status !== "TODO" && status !== "DONE") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const item = await prisma.onboardingChecklist.findUnique({
      where: { id: params.checklistId },
    });

    if (!item || item.prospectId !== params.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.onboardingChecklist.update({
      where: { id: params.checklistId },
      data: { status: status === "DONE" ? "done" : "todo" },
    });

    return NextResponse.json({
      id: updated.id,
      prospectId: updated.prospectId,
      stepNumber: updated.stepNumber,
      title: updated.title,
      description: updated.description || "",
      assignee: updated.assignee || "",
      status: updated.status === "done" ? "DONE" : "TODO",
      dueDate: updated.dueDate || null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt || updated.createdAt,
    });
  } catch (err) {
    console.error("PATCH checklist error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
