// app/api/prospects/route.ts — Prisma-backed prospect collection endpoint
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { buildOnboardingChecklistData } from "@/lib/onboarding";
import { mapCardToProspect, toFrontendStage } from "@/lib/api";
import { requireAuth } from "@/lib/serverAuth";
import { validateCreateProspect } from "@/lib/prospectValidation";
import { cursorQuerySchema, prospectFieldsSchema } from "@/lib/validation/schemas";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { captureException, createRequestId, log } from "@/lib/logger";

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

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await requireAuth(["admin", "manager", "agent"]);
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
    const { cursor, limit } = parsedQuery.data;

    const includeRelations = fieldsMode === "full";
    const prospects = await prisma.prospect.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      ...(includeRelations
        ? {
            include: {
              notes: { orderBy: { createdAt: "desc" }, take: 10 },
              checklistItems: { orderBy: { stepNumber: "asc" } },
            },
          }
        : {}),
    });

    const hasMore = prospects.length > limit;
    const page = prospects.slice(0, limit);
    const data = page.map((prospect: any) => {
        const mapped = mapCardToProspect({ ...prospect, stage: toFrontendStage(prospect.stage) });
        return {
          ...mapped,
          notes: includeRelations ? (prospect.notes || []).map(mapNote) : [],
          checklistItems: includeRelations ? (prospect.checklistItems || []).map(mapChecklistItem) : [],
        };
      });
    log("info", "Prospects fetched", { requestId, userId: auth.user.id, count: data.length, fieldsMode });
    return jsonWithHeaders({
      data,
      pagination: {
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
        hasMore,
      },
    });
  } catch (err) {
    captureException(err, { route: "GET /api/prospects", requestId, userId: auth.user.id });
    const message = err instanceof Error ? err.message : "Failed to fetch prospects";
    const rsaHint = message.includes("allowPublicKeyRetrieval")
      ? "Database auth failed: enable MARIADB_ALLOW_PUBLIC_KEY_RETRIEVAL=true in Backend/.env and restart dev servers."
      : "Failed to fetch prospects";
    return jsonWithHeaders({ error: rsaHint }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await requireAuth(["admin", "manager"]);
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

    const created = await prisma.$transaction(async (tx: any) => {
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
      await tx.auditLog.create({
        data: {
          prospectId: prospect.id,
          action: "PROSPECT_CREATED",
          actorId: auth.user.id,
          actorRole: auth.user.role,
          metadata: { stage: prospect.stage },
        },
      });

      return prospect;
    });

    const prospect = mapCardToProspect({ ...created, stage: toFrontendStage(created.stage) });
    const fullProspect = await prisma.prospect.findFirst({
      where: { id: created.id, deletedAt: null },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        checklistItems: { orderBy: { stepNumber: "asc" } },
      },
    });

    return jsonWithHeaders({
      ...prospect,
      notes: (fullProspect?.notes || []).map(mapNote),
      checklistItems: (fullProspect?.checklistItems || []).map(mapChecklistItem),
    }, { status: 201 });
  } catch (err) {
    captureException(err, { route: "POST /api/prospects", requestId, userId: auth.user.id });
    return jsonWithHeaders({ error: "Failed to create prospect" }, { status: 500 });
  }
}
