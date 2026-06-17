// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch, readBackendResponse } from "@/lib/api";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const res = await backendFetch("/api/auth/me", { token });
    const json = await readBackendResponse(res);

    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || json.error || "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({ user: json.data });
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}
