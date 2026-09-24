/**
 * API contracts shared by the web app and the worker. Request bodies are
 * validated with these schemas on the server; the web app uses the types.
 */
import { z } from "zod";

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;
export const FEEDBACK_MAX = 2000;

export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN)
  .max(DISPLAY_NAME_MAX)
  .regex(/^[\p{L}\p{N} _.'-]+$/u, "Letters, numbers, spaces and _ . ' - only");

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Invite codes look like ABCD-1234");

// ---- Health -------------------------------------------------------------

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  env: z.string(),
  version: z.string(),
  time: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ---- Users & session ----------------------------------------------------

export const meSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  isAdmin: z.boolean(),
  createdAt: z.string(),
  passkeyCount: z.number().int(),
});
export type Me = z.infer<typeof meSchema>;

export const updateProfileRequestSchema = z.object({
  displayName: displayNameSchema,
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const signupStatusSchema = z.object({
  /** True until the first account exists; that account becomes the admin. */
  bootstrap: z.boolean(),
  emailLoginEnabled: z.boolean(),
});
export type SignupStatus = z.infer<typeof signupStatusSchema>;

// ---- Passkeys -----------------------------------------------------------

export const registerOptionsRequestSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  /** Optional only while bootstrapping the very first account. */
  inviteCode: inviteCodeSchema.optional(),
});
export type RegisterOptionsRequest = z.infer<typeof registerOptionsRequestSchema>;

/** WebAuthn JSON payloads are validated by @simplewebauthn on the server. */
export const webauthnVerifyRequestSchema = z.object({
  challengeId: z.string().min(1),
  response: z.record(z.string(), z.unknown()),
});
export type WebauthnVerifyRequest = z.infer<typeof webauthnVerifyRequestSchema>;

// ---- Email login link ---------------------------------------------------

export const emailLoginRequestSchema = z.object({ email: emailSchema });
export type EmailLoginRequest = z.infer<typeof emailLoginRequestSchema>;

export const emailLoginVerifyRequestSchema = z.object({ token: z.string().min(20).max(200) });
export type EmailLoginVerifyRequest = z.infer<typeof emailLoginVerifyRequestSchema>;

// ---- Invites ------------------------------------------------------------

export const inviteSchema = z.object({
  code: z.string(),
  createdAt: z.string(),
  usedAt: z.string().nullable(),
  usedByName: z.string().nullable(),
});
export type Invite = z.infer<typeof inviteSchema>;

export const INVITES_PER_PLAYER = 3;

// ---- Feedback -----------------------------------------------------------

export const feedbackRequestSchema = z.object({
  message: z.string().trim().min(1).max(FEEDBACK_MAX),
  buildVersion: z.string().max(100),
  route: z.string().max(200),
  /** Optional device-check results or other context. */
  context: z.record(z.string(), z.unknown()).optional(),
});
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

export const feedbackItemSchema = z.object({
  id: z.string(),
  message: z.string(),
  buildVersion: z.string(),
  route: z.string(),
  userAgent: z.string().nullable(),
  context: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  userName: z.string().nullable(),
});
export type FeedbackItem = z.infer<typeof feedbackItemSchema>;

// ---- Errors -------------------------------------------------------------

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ---- Live channel (Phase 0: echo) ---------------------------------------

export const liveMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping"), sentAt: z.number() }),
  z.object({ type: z.literal("pong"), sentAt: z.number(), connections: z.number().int() }),
]);
export type LiveMessage = z.infer<typeof liveMessageSchema>;
