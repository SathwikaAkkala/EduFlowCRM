// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { backendFetch, readBackendResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await backendFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const json = await readBackendResponse(res);

    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || json.error || "Login failed" },
        { status: res.status }
      );
    }

    // Set the JWT token as httpOnly cookie on the Next.js side
    const token = json.data?.token;
    const response = NextResponse.json({
      success: true,
      user: json.data?.user,
    });

    if (token) {
      response.cookies.set("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });
    }

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
