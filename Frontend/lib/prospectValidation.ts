import { z } from "zod";
import { createProspectSchema, updateProspectSchema } from "@/lib/validation/schemas";

type ProspectInput = Record<string, unknown>;

function parseError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid payload";
}

export function validateCreateProspect(input: ProspectInput) {
  const parsed = createProspectSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parseError(parsed.error) };

  return {
    ok: true as const,
    data: {
      ...parsed.data,
      source: parsed.data.source ?? "Direct",
      lastContactDate: parsed.data.lastContactDate ?? null,
      nextFollowUpDate: parsed.data.nextFollowUpDate ?? null,
    },
  };
}

export function validateUpdateProspect(input: ProspectInput) {
  const parsed = updateProspectSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parseError(parsed.error) };

  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  );
  return { ok: true as const, data };
}

