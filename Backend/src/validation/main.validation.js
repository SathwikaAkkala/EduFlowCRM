import { z } from "zod";

const stageSchema = z.enum([
    "Cold",
    "Contacted",
    "Demo Booked",
    "Demo Done",
    "Proposal Sent",
    "Pilot Closed"
]);

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10)
});

export const idParamSchema = z.object({
    id: z.string().min(1, "Invalid id format")
});

export const cardIdParamSchema = z.object({
    cardId: z.string().min(1, "Invalid id format")
});

export const createCardBodySchema = z.object({
    name: z.string().trim().min(1, "name is required"),
    school: z.string().trim().min(1, "school is required"),
    role: z.string().trim().optional(),
    email: z.string().trim().email("Invalid email").optional(),
    phone: z.string().trim().optional(),
    source: z.string().trim().optional(),
    stage: stageSchema.optional(),
    lastContactDate: z.union([z.string().trim(), z.null()]).optional(),
    nextFollowUpDate: z.union([z.string().trim(), z.null()]).optional()
});

export const updateCardBodySchema =
    createCardBodySchema.partial().refine(
        (payload) => Object.keys(payload).length > 0,
        "At least one field is required to update"
    );

export const addNoteBodySchema = z.object({
    content: z.string().trim().min(1, "content is required").max(2000)
});

export const updateChecklistBodySchema = z.object({
    status: z.enum(["todo", "done"])
});
