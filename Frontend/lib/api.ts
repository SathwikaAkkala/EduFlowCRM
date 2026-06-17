// lib/api.ts — Central API client for the Express backend

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";
const NORMALIZED_BACKEND_URL = BACKEND_URL.replace(/\/+$/, "");

// ─── Stage Mapping ───────────────────────────────────────────────
// Frontend uses UPPERCASE_SNAKE: "COLD", "DEMO_BOOKED", "PILOT_CLOSED"
// Backend  uses Title Case:      "Cold", "Demo Booked", "Pilot Closed"

const STAGE_TO_BACKEND: Record<string, string> = {
  COLD:          "Cold",
  CONTACTED:     "Contacted",
  DEMO_BOOKED:   "Demo Booked",
  DEMO_DONE:     "Demo Done",
  PROPOSAL_SENT: "Proposal Sent",
  PILOT_CLOSED:  "Pilot Closed",
};

const STAGE_TO_FRONTEND: Record<string, string> = {
  "Cold":          "COLD",
  "Contacted":     "CONTACTED",
  "Demo Booked":   "DEMO_BOOKED",
  "Demo Done":     "DEMO_DONE",
  "Proposal Sent": "PROPOSAL_SENT",
  "Pilot Closed":  "PILOT_CLOSED",
};

export function toBackendStage(frontendStage: string): string {
  return STAGE_TO_BACKEND[frontendStage] || frontendStage;
}

export function toFrontendStage(backendStage: string): string {
  return STAGE_TO_FRONTEND[backendStage] || backendStage;
}

// ─── Generic Fetch Helper ────────────────────────────────────────

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function backendFetch(path: string, options: FetchOptions = {}) {
  const { token, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${NORMALIZED_BACKEND_URL}${path}`, {
      ...rest,
      headers,
      credentials: "include",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach backend server";
    throw new Error(`Backend request failed: ${message}`);
  }

  return res;
}

export async function readBackendResponse<T = any>(response: Response): Promise<T & { message?: string; error?: string }> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return { message: text } as T & { message?: string; error?: string };
    }
  }

  return { message: text } as T & { message?: string; error?: string };
}

export async function apiCall(path: string, options: FetchOptions = {}) {
  const normalizedPath = path.startsWith("/api") ? path : `/api${path}`;
  const response = await backendFetch(normalizedPath, options);
  return readBackendResponse(response);
}

// ─── Map a single backend card → frontend Prospect shape ─────────

export function mapCardToProspect(card: any) {
  return {
    id:               card.id || card._id,
    name:             card.name,
    school:           card.school,
    role:             card.role || "",
    email:            card.email || "",
    phone:            card.phone || "",
    source:           card.source || "Direct",
    stage:            toFrontendStage(card.stage),
    lastContactDate:  card.lastContactDate || null,
    nextFollowUpDate: card.nextFollowUpDate || null,
    completed:        card.completed || false,
    completedAt:      card.completedAt || null,
    createdAt:        card.createdAt,
    updatedAt:        card.updatedAt || card.createdAt,
    notes:            [],
    checklistItems:   [],
  };
}
