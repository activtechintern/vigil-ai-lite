import { z } from "zod";

// Monitor validation
export const monitorSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Monitor name is required")
    .max(100, "Monitor name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Monitor name can only contain letters, numbers, spaces, hyphens, and underscores"),
  url: z.string()
    .trim()
    .url("Please enter a valid URL")
    .max(500, "URL must be less than 500 characters")
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, "URL must use HTTP or HTTPS protocol"),
  check_interval: z.number()
    .int("Check interval must be a whole number")
    .min(1, "Check interval must be at least 1 minute")
    .max(1440, "Check interval cannot exceed 24 hours (1440 minutes)"),
  alert_email: z.string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
});

// Auth validation
export const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
});

export const signupSchema = loginSchema.extend({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
});

// Report validation
export const reportSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: "Period must be daily, weekly, or monthly" })
  }),
  startDate: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end;
}, {
  message: "Start date must be before or equal to end date",
  path: ["endDate"],
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 90;
}, {
  message: "Date range cannot exceed 90 days",
  path: ["endDate"],
});

// Profile validation
export const profileSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  avatar_url: z.string()
    .trim()
    .url("Please enter a valid URL")
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

// Sanitization helper
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent basic XSS
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}
