import { cookies } from "next/headers";
import { backendFetch, readBackendResponse } from "@/lib/api";

export function getFrontendAuthToken() {
  return cookies().get("token")?.value;
}

export async function backendProxyRequest(path: string, init: RequestInit = {}) {
  const token = getFrontendAuthToken();
  const response = await backendFetch(path, token ? { ...init, token } : init);
  const body = await readBackendResponse(response);
  return { response, body };
}
