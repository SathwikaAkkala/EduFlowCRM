import { NextResponse } from "next/server";

export function jsonWithHeaders(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Request-Handled-By", "next-api");
  return response;
}

