import { z } from "zod";
import { toBackendStage } from "@/lib/api";

const validBackendStages = [
  "Cold",
  "Contacted",
  "Demo Booked",
  "Demo Done",
  "Proposal Sent",
  "Pilot Closed",
] as const;

export const noteInputSchema = z.object({
  content: z.string().trim().min(1, "content is required").max(2000, "content must be at most 2000 characters"),
});

export const cursorQuerySchema = z.object({
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const prospectFieldsSchema = z.enum(["full", "summary"]).default("full");

const optionalDateInput = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date format" });
      return z.NEVER;
    }
    return date;
  });

const optionalTrimmed = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  });

export const createProspectSchema = z.object({
  name: z.string().trim().min(1, "name and school are required"),
  school: z.string().trim().min(1, "name and school are required"),
  role: optionalTrimmed.optional(),
  email: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    })
    .refine((email) => email === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Invalid email")
    .optional(),
  phone: optionalTrimmed.optional(),
  source: optionalTrimmed.optional(),
  stage: z
    .union([z.string(), z.undefined()])
    .transform((stage) => {
      if (!stage) return "Cold";
      return toBackendStage(stage);
    })
    .refine((stage) => validBackendStages.includes(stage as (typeof validBackendStages)[number]), "Invalid stage"),
  lastContactDate: optionalDateInput.optional(),
  nextFollowUpDate: optionalDateInput.optional(),
});

export const updateProspectSchema = z
  .object({
    name: z.string().trim().min(1, "Invalid name").optional(),
    school: z.string().trim().min(1, "Invalid school").optional(),
    role: optionalTrimmed.optional(),
    email: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === null) return null;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      })
      .refine((email) => email === undefined || email === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Invalid email")
      .optional(),
    phone: optionalTrimmed.optional(),
    source: optionalTrimmed.optional(),
    stage: z
      .string()
      .optional()
      .transform((value) => (value ? toBackendStage(value) : undefined))
      .refine(
        (stage) => stage === undefined || validBackendStages.includes(stage as (typeof validBackendStages)[number]),
        "Invalid stage"
      ),
    lastContactDate: optionalDateInput.optional(),
    nextFollowUpDate: optionalDateInput.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "At least one field is required");
