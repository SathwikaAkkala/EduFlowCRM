import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, prismaMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  prismaMock: {
    prospect: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    prospectNote: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/serverAuth", () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

import * as prospectsRoute from "@/app/api/prospects/route";
import * as prospectByIdRoute from "@/app/api/prospects/[id]/route";
import * as notesRoute from "@/app/api/prospects/[id]/notes/route";

function authedUser() {
  return {
    ok: true as const,
    user: { id: "u1", role: "admin", email: "a@a.com", name: "Admin" },
    token: "t",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthMock.mockResolvedValue(authedUser());
});

describe("prospect api routes", () => {
  it("GET /api/prospects returns paginated list", async () => {
    prismaMock.prospect.findMany.mockResolvedValue([
      { id: "p2", name: "N2", school: "S2", stage: "Cold", createdAt: new Date(), updatedAt: new Date(), notes: [], checklistItems: [] },
      { id: "p1", name: "N1", school: "S1", stage: "Cold", createdAt: new Date(), updatedAt: new Date(), notes: [], checklistItems: [] },
    ]);

    const req = new NextRequest("http://localhost/api/prospects?limit=1");
    const res = await prospectsRoute.GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination.hasMore).toBe(true);
  });

  it("POST /api/prospects creates prospect", async () => {
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        prospect: { create: vi.fn().mockResolvedValue({ id: "p1", name: "A", school: "S", stage: "Cold", createdAt: new Date(), updatedAt: new Date() }) },
        onboardingChecklist: { createMany: vi.fn() },
        auditLog: { create: vi.fn() },
      };
      return cb(tx);
    });
    prismaMock.prospect.findFirst.mockResolvedValue({ id: "p1", name: "A", school: "S", stage: "Cold", createdAt: new Date(), updatedAt: new Date(), notes: [], checklistItems: [] });
    const req = new NextRequest("http://localhost/api/prospects", {
      method: "POST",
      body: JSON.stringify({ name: "Alpha School", school: "Springfield High", stage: "Cold", source: "Direct" }),
      headers: { "content-type": "application/json" },
    });
    const res = await prospectsRoute.POST(req);
    expect(res.status).toBe(201);
  });

  it("PATCH /api/prospects/[id] persists stage change", async () => {
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        prospect: {
          findFirst: vi.fn().mockResolvedValue({ stage: "Cold" }),
          update: vi.fn().mockResolvedValue({ id: "p1", name: "A", school: "S", stage: "Contacted", createdAt: new Date(), updatedAt: new Date() }),
        },
        onboardingChecklist: { createMany: vi.fn() },
        auditLog: { create: vi.fn() },
      };
      return cb(tx);
    });
    prismaMock.prospect.findFirst.mockResolvedValue({ id: "p1", name: "A", school: "S", stage: "Contacted", createdAt: new Date(), updatedAt: new Date(), notes: [], checklistItems: [] });
    const req = new NextRequest("http://localhost/api/prospects/p1", {
      method: "PATCH",
      body: JSON.stringify({ stage: "CONTACTED" }),
      headers: { "content-type": "application/json" },
    });
    const res = await prospectByIdRoute.PATCH(req, { params: { id: "p1" } });
    expect(res.status).toBe(200);
  });

  it("POST /api/prospects/[id]/notes appends note and writes audit", async () => {
    prismaMock.prospect.findFirst.mockResolvedValue({ id: "p1" });
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        prospectNote: { create: vi.fn().mockResolvedValue({ id: "n1", prospectId: "p1", content: "hello", createdAt: new Date() }) },
        auditLog: { create: vi.fn() },
      };
      return cb(tx);
    });
    const req = new NextRequest("http://localhost/api/prospects/p1/notes", {
      method: "POST",
      body: JSON.stringify({ content: "hello" }),
      headers: { "content-type": "application/json" },
    });
    const res = await notesRoute.POST(req, { params: { id: "p1" } });
    expect(res.status).toBe(201);
  });

  it("checklist generation remains idempotent when stage is already Pilot Closed", async () => {
    const createMany = vi.fn();
    const stageState = ["Cold", "Pilot Closed"];
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const existingStage = stageState.shift() ?? "Pilot Closed";
      const tx = {
        prospect: {
          findFirst: vi.fn().mockResolvedValue({ stage: existingStage }),
          update: vi.fn().mockResolvedValue({ id: "p1", stage: "Pilot Closed", name: "A", school: "S", createdAt: new Date(), updatedAt: new Date() }),
        },
        onboardingChecklist: { createMany },
        auditLog: { create: vi.fn() },
      };
      return cb(tx);
    });
    prismaMock.prospect.findFirst.mockResolvedValue({ id: "p1", stage: "Pilot Closed", name: "A", school: "S", createdAt: new Date(), updatedAt: new Date(), notes: [], checklistItems: [] });

    const request = () =>
      new NextRequest("http://localhost/api/prospects/p1", {
        method: "PATCH",
        body: JSON.stringify({ stage: "PILOT_CLOSED" }),
        headers: { "content-type": "application/json" },
      });

    await prospectByIdRoute.PATCH(request(), { params: { id: "p1" } });
    await prospectByIdRoute.PATCH(request(), { params: { id: "p1" } });

    expect(createMany).toHaveBeenCalledTimes(1);
  });
});
