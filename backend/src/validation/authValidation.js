import { z } from "zod";

const normalizeEmail = (email) => email.trim().toLowerCase();

// Shared between signup and login so the two never validate email
// differently by accident as the file evolves.
const emailSchema = z
  .string()
  .trim()
  .max(255, "Email is too long")
  .email("Invalid email address")
  .transform(normalizeEmail);

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(72, "Password is too long"), // bcrypt silently ignores bytes past 72 — cap here instead
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Password is too long"),
});