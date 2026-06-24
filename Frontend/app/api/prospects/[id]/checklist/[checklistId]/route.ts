import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import { backendProxyRequest } from "@/lib/backendProxy";

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
    const { response, body } = await backendProxyRequest(`/api/checklist/${params.checklistId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: status === "DONE" ? "done" : "todo" }),
    });

    if (!response.ok) {
      const message = body?.message || body?.error || "Failed to update";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const prospectRes = await backendProxyRequest(`/api/cards/${params.id}`, { method: "GET" });
    const prospect = prospectRes.body?.data;

    return NextResponse.json({
      id: body.data.id,
      prospectId: body.data.prospectId,
      stepNumber: body.data.stepNumber,
      title: body.data.title,
      description: body.data.description || "",
      assignee: body.data.assignee || "",
      status: body.data.status === "done" ? "DONE" : "TODO",
      dueDate: body.data.dueDate || null,
      createdAt: body.data.createdAt,
      updatedAt: body.data.updatedAt || body.data.createdAt,
      prospectCompletion: prospect,
    });
  } catch (err) {
    console.error("PATCH checklist error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
