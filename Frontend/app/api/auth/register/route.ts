// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await backendFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || "Registration failed" },
        { status: res.status }
      );
    }

    // Set the JWT token as httpOnly cookie
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
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (err) {
    console.error("Register error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
