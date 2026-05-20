// app/api/prospects/[id]/notes/route.ts — Prisma-backed notes endpoint
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { cursorQuerySchema, noteInputSchema } from "@/lib/validation/schemas";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { captureException, createRequestId } from "@/lib/logger";

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
    const { cursor, limit } = parsedQuery.data;
    const prospect = await prisma.prospect.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { id: true },
    });
    if (!prospect) return jsonWithHeaders({ error: "Not found" }, { status: 404 });

    const notes = await prisma.prospectNote.findMany({
      where: { prospectId: params.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasMore = notes.length > limit;
    const page = notes.slice(0, limit);

    return jsonWithHeaders({
      data: page.map((note) => ({
        id: note.id,
        prospectId: note.prospectId,
        content: note.content,
        createdAt: note.createdAt,
      })),
      pagination: {
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
        hasMore,
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

    const prospect = await prisma.prospect.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { id: true },
    });

    if (!prospect) {
      return jsonWithHeaders({ error: "Not found" }, { status: 404 });
    }

    const note = await prisma.$transaction(async (tx: any) => {
      const created = await tx.prospectNote.create({
        data: {
          prospectId: params.id,
          content: normalizedContent,
        },
      });
      await tx.auditLog.create({
        data: {
          prospectId: params.id,
          action: "NOTE_ADDED",
          actorId: auth.user.id,
          actorRole: auth.user.role,
          metadata: { noteId: created.id },
        },
      });
      return created;
    });

    return jsonWithHeaders(
      {
        id: note.id,
        prospectId: note.prospectId,
        content: note.content,
        createdAt: note.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    captureException(err, { route: "POST /api/prospects/[id]/notes", requestId, userId: auth.user.id, prospectId: params.id });
    return jsonWithHeaders({ error: "Failed to add note" }, { status: 500 });
  }
}
