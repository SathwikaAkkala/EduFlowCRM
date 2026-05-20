import { toBackendStage } from "@/lib/api";

const VALID_BACKEND_STAGES = new Set([
  "Cold",
  "Contacted",
  "Demo Booked",
  "Demo Done",
  "Proposal Sent",
  "Pilot Closed",
]);

type ProspectInput = {
  name?: unknown;
  school?: unknown;
  role?: unknown;
  email?: unknown;
  phone?: unknown;
  source?: unknown;
  stage?: unknown;
  lastContactDate?: unknown;
  nextFollowUpDate?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export function validateCreateProspect(input: ProspectInput) {
  const name = asTrimmedString(input.name);
  const school = asTrimmedString(input.school);
  if (!name || !school) {
    return { ok: false as const, error: "name and school are required" };
  }

  const email = asTrimmedString(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Invalid email" };
  }

  const mappedStage = input.stage ? toBackendStage(String(input.stage)) : "Cold";
  if (!VALID_BACKEND_STAGES.has(mappedStage)) {
    return { ok: false as const, error: "Invalid stage" };
  }

  const lastContactDate = asOptionalDate(input.lastContactDate);
  const nextFollowUpDate = asOptionalDate(input.nextFollowUpDate);
  if (lastContactDate === undefined || nextFollowUpDate === undefined) {
    return { ok: false as const, error: "Invalid date format" };
  }

  return {
    ok: true as const,
    data: {
      name,
      school,
      role: asTrimmedString(input.role),
      email: email ?? null,
      phone: asTrimmedString(input.phone),
      source: asTrimmedString(input.source) ?? "Direct",
      stage: mappedStage,
      lastContactDate: lastContactDate ?? null,
      nextFollowUpDate: nextFollowUpDate ?? null,
    },
  };
}

export function validateUpdateProspect(input: ProspectInput) {
  const output: Record<string, unknown> = {};

  if ("name" in input) {
    const name = asTrimmedString(input.name);
    if (!name) return { ok: false as const, error: "Invalid name" };
    output.name = name;
  }
  if ("school" in input) {
    const school = asTrimmedString(input.school);
    if (!school) return { ok: false as const, error: "Invalid school" };
    output.school = school;
  }
  if ("role" in input) output.role = asTrimmedString(input.role);
  if ("phone" in input) output.phone = asTrimmedString(input.phone);
  if ("source" in input) output.source = asTrimmedString(input.source) ?? "Direct";
  if ("email" in input) {
    const email = asTrimmedString(input.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false as const, error: "Invalid email" };
    }
    output.email = email;
  }
  if ("stage" in input) {
    const mappedStage = toBackendStage(String(input.stage));
    if (!VALID_BACKEND_STAGES.has(mappedStage)) {
      return { ok: false as const, error: "Invalid stage" };
    }
    output.stage = mappedStage;
  }
  if ("lastContactDate" in input) {
    const d = asOptionalDate(input.lastContactDate);
    if (d === undefined) return { ok: false as const, error: "Invalid lastContactDate" };
    output.lastContactDate = d;
  }
  if ("nextFollowUpDate" in input) {
    const d = asOptionalDate(input.nextFollowUpDate);
    if (d === undefined) return { ok: false as const, error: "Invalid nextFollowUpDate" };
    output.nextFollowUpDate = d;
  }

  if (Object.keys(output).length === 0) {
    return { ok: false as const, error: "At least one field is required" };
  }

  return { ok: true as const, data: output };
}

