import { z } from "zod";

export const registerBodySchema = z.object({
    name: z.string().trim().min(1, "name is required"),
    email: z.string().trim().email("Invalid email"),
    password: z.string().min(6, "password must be at least 6 characters")
});

export const loginBodySchema = z.object({
    email: z.string().trim().email("Invalid email"),
    password: z.string().min(1, "password is required")
});
