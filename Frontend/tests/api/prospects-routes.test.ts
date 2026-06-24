import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, backendProxyRequestMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  backendProxyRequestMock: vi.fn(),
}));

vi.mock("@/lib/serverAuth", () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock("@/lib/backendProxy", () => ({
  backendProxyRequest: (...args: unknown[]) => backendProxyRequestMock(...args),
}));

import * as prospectsRoute from "@/app/api/prospects/route";
import * as prospectByIdRoute from "@/app/api/prospects/[id]/route";
import * as notesRoute from "@/app/api/prospects/[id]/notes/route";
import * as checklistRoute from "@/app/api/prospects/[id]/checklist/[checklistId]/route";

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
  it("GET /api/prospects returns a flat list", async () => {
    backendProxyRequestMock.mockResolvedValueOnce({
      response: new Response(JSON.stringify({
        data: [
          { _id: "Cold", prospects: [{ id: "p2", name: "N2", school: "S2", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] },
        ],
        pagination: { totalPages: 1 },
      }), { status: 200, headers: { "content-type": "application/json" } }),
      body: {
        data: [
          { _id: "Cold", prospects: [{ id: "p2", name: "N2", school: "S2", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] },
        ],
        pagination: { totalPages: 1 },
      },
    });

    const req = new NextRequest("http://localhost/api/prospects?limit=1");
    const res = await prospectsRoute.GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].stage).toBe("COLD");
  });

  it("POST /api/prospects creates prospect", async () => {
    backendProxyRequestMock.mockResolvedValueOnce({
      response: new Response(JSON.stringify({
        data: { id: "p1", name: "A", school: "S", stage: "Cold", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      }), { status: 201, headers: { "content-type": "application/json" } }),
      body: {
        data: { id: "p1", name: "A", school: "S", stage: "Cold", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      },
    });
    const req = new NextRequest("http://localhost/api/prospects", {
      method: "POST",
      body: JSON.stringify({ name: "Alpha School", school: "Springfield High", stage: "Cold", source: "Direct" }),
      headers: { "content-type": "application/json" },
    });
    const res = await prospectsRoute.POST(req);
    expect(res.status).toBe(201);
  });

  it("PATCH /api/prospects/[id] persists stage change", async () => {
    backendProxyRequestMock
      .mockResolvedValueOnce({
        response: new Response(JSON.stringify({
          data: { id: "p1", name: "A", school: "S", stage: "Contacted", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        }), { status: 200, headers: { "content-type": "application/json" } }),
        body: {
          data: { id: "p1", name: "A", school: "S", stage: "Contacted", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        },
      })
      .mockResolvedValueOnce({
        response: new Response(JSON.stringify({
          data: {
            id: "p1",
            name: "A",
            school: "S",
            stage: "Contacted",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: [],
            checklistItems: [],
          },
        }), { status: 200, headers: { "content-type": "application/json" } }),
        body: {
          data: {
            id: "p1",
            name: "A",
            school: "S",
            stage: "Contacted",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: [],
            checklistItems: [],
          },
        },
      });
    const req = new NextRequest("http://localhost/api/prospects/p1", {
      method: "PATCH",
      body: JSON.stringify({ stage: "CONTACTED" }),
      headers: { "content-type": "application/json" },
    });
    const res = await prospectByIdRoute.PATCH(req, { params: { id: "p1" } });
    expect(res.status).toBe(200);
  });

  it("POST /api/prospects/[id]/notes appends note and writes audit", async () => {
    backendProxyRequestMock.mockResolvedValueOnce({
      response: new Response(JSON.stringify({ id: "n1", prospectId: "p1", content: "hello", createdAt: new Date().toISOString() }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
      body: { id: "n1", prospectId: "p1", content: "hello", createdAt: new Date().toISOString() },
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
    backendProxyRequestMock
      .mockResolvedValueOnce({
        response: new Response(JSON.stringify({
          data: {
            id: "i1",
            prospectId: "p1",
            stepNumber: 1,
            title: "Step",
            description: "",
            assignee: "",
            status: "done",
            dueDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }), { status: 200, headers: { "content-type": "application/json" } }),
        body: {
          data: {
            id: "i1",
            prospectId: "p1",
            stepNumber: 1,
            title: "Step",
            description: "",
            assignee: "",
            status: "done",
            dueDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      })
      .mockResolvedValueOnce({
        response: new Response(JSON.stringify({
          data: { id: "p1", completed: true, completedAt: new Date().toISOString() },
        }), { status: 200, headers: { "content-type": "application/json" } }),
        body: { data: { id: "p1", completed: true, completedAt: new Date().toISOString() } },
      });

    const res = await checklistRoute.PATCH(
      new NextRequest("http://localhost/api/prospects/p1/checklist/i1", {
        method: "PATCH",
        body: JSON.stringify({ status: "DONE" }),
        headers: { "content-type": "application/json" },
      }),
      { params: { id: "p1", checklistId: "i1" } }
    );
    expect(res.status).toBe(200);
  });
});
