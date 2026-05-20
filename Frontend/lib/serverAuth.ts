import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthResult =
  | { ok: true; user: AuthUser; token: string }
  | { ok: false; response: NextResponse };

export async function requireAuth(allowedRoles?: string[]): Promise<AuthResult> {
  const token = cookies().get("token")?.value;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  try {
    const res = await backendFetch("/api/auth/me", { token });
    const json = await res.json();
    if (!res.ok || !json?.data) {
      return { ok: false, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
    }

    const user = json.data as AuthUser;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    return { ok: true, user, token };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
}

