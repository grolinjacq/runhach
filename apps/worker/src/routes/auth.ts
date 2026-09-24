import {
  emailLoginRequestSchema,
  emailLoginVerifyRequestSchema,
  registerOptionsRequestSchema,
  webauthnVerifyRequestSchema,
  type SignupStatus,
} from "@runhach/shared";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { authChallenges, emailLoginTokens, inviteCodes, passkeys, users } from "../db/schema";
import type { AppContext } from "../env";
import { randomToken, sha256Hex } from "../lib/crypto";
import { emailLoginEnabled, isLocalEnv, sendEmail } from "../lib/email";
import { apiError, readJson } from "../lib/http";
import { requestOrigin } from "../lib/origin";
import { createSession, destroySession } from "../lib/session";
import { loadMe, requireUser } from "./me";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const EMAIL_TOKEN_TTL_MS = 15 * 60 * 1000;
const EMAIL_TOKENS_PER_WINDOW = 3;

type Ctx = Context<AppContext>;

interface RegisterPayload {
  userId: string;
  displayName: string;
  email: string;
  inviteCode: string | null;
}

function relyingParty(c: Ctx) {
  const origin = requestOrigin(c);
  if (!origin) apiError(403, "bad_origin", "Requests from this origin are not allowed");
  return { origin, rpID: new URL(origin).hostname, rpName: c.env.RP_NAME };
}

async function hasAnyUser(c: Ctx): Promise<boolean> {
  const row = await c.var.db.select({ id: users.id }).from(users).limit(1);
  return row.length > 0;
}

async function storeChallenge(
  c: Ctx,
  kind: "register" | "login" | "add-passkey",
  challenge: string,
  userId: string | null,
  payload: RegisterPayload | null = null,
): Promise<string> {
  const id = randomToken(16);
  await c.var.db.insert(authChallenges).values({
    id,
    kind,
    challenge,
    userId,
    payload: payload as Record<string, unknown> | null,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return id;
}

/** Deletes and returns a challenge; each challenge can be used once. */
async function consumeChallenge(c: Ctx, id: string, kind: "register" | "login" | "add-passkey") {
  const [row] = await c.var.db.delete(authChallenges).where(eq(authChallenges.id, id)).returning();
  if (!row || row.kind !== kind || row.expiresAt < Date.now()) {
    apiError(400, "challenge_expired", "This sign-in attempt expired. Please try again.");
  }
  return row;
}

export const auth = new Hono<AppContext>();

auth.get("/status", async (c) => {
  const status: SignupStatus = {
    bootstrap: !(await hasAnyUser(c)),
    emailLoginEnabled: emailLoginEnabled(c.env),
  };
  return c.json(status);
});

// ---- Sign up with a passkey ---------------------------------------------

auth.post("/register/options", async (c) => {
  const { rpID, rpName } = relyingParty(c);
  const body = await readJson(c, registerOptionsRequestSchema);

  const [existing] = await c.var.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);
  if (existing) apiError(409, "email_taken", "That email already has an account. Sign in instead.");

  const bootstrap = !(await hasAnyUser(c));
  if (!bootstrap) {
    if (!body.inviteCode) apiError(400, "invite_required", "An invite code is required to join.");
    const [invite] = await c.var.db
      .select({ code: inviteCodes.code })
      .from(inviteCodes)
      .where(and(eq(inviteCodes.code, body.inviteCode), isNull(inviteCodes.usedAt)))
      .limit(1);
    if (!invite) apiError(400, "invalid_invite", "That invite code is invalid or already used.");
  }

  const userId = crypto.randomUUID();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: body.email,
    userDisplayName: body.displayName,
    userID: userIdBytes(userId),
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  const challengeId = await storeChallenge(c, "register", options.challenge, null, {
    userId,
    displayName: body.displayName,
    email: body.email,
    inviteCode: bootstrap ? null : (body.inviteCode ?? null),
  });
  return c.json({ challengeId, options });
});

auth.post("/register/verify", async (c) => {
  const { origin, rpID } = relyingParty(c);
  const body = await readJson(c, webauthnVerifyRequestSchema);
  const challenge = await consumeChallenge(c, body.challengeId, "register");
  const payload = challenge.payload as unknown as RegisterPayload;

  const verification = await verifyRegistrationResponse({
    response: body.response as unknown as RegistrationResponseJSON,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  }).catch((err: unknown) => {
    console.warn("passkey registration failed", err);
    return apiError(400, "passkey_failed", "Could not verify the passkey. Please try again.");
  });
  if (!verification.verified) apiError(400, "passkey_failed", "Could not verify the passkey.");
  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const now = Date.now();
  const db = c.var.db;
  if (payload.inviteCode === null) {
    // Bootstrap: only succeeds while there are no users, so exactly one admin is created.
    const result = await c.env.DB.prepare(
      `INSERT INTO users (id, display_name, email, is_admin, created_at)
       SELECT ?1, ?2, ?3, 1, ?4 WHERE NOT EXISTS (SELECT 1 FROM users)`,
    )
      .bind(payload.userId, payload.displayName, payload.email, now)
      .run();
    if (result.meta.changes !== 1) {
      apiError(400, "invite_required", "An invite code is required to join.");
    }
  } else {
    // Claim the invite first so two people can't redeem the same code.
    const claimed = await db
      .update(inviteCodes)
      .set({ usedAt: now })
      .where(and(eq(inviteCodes.code, payload.inviteCode), isNull(inviteCodes.usedAt)))
      .returning({ code: inviteCodes.code });
    if (claimed.length !== 1) {
      apiError(400, "invalid_invite", "That invite code is invalid or already used.");
    }
    try {
      await db.insert(users).values({
        id: payload.userId,
        displayName: payload.displayName,
        email: payload.email,
        isAdmin: false,
        createdAt: now,
      });
    } catch (err) {
      await db
        .update(inviteCodes)
        .set({ usedAt: null })
        .where(eq(inviteCodes.code, payload.inviteCode));
      console.warn("user insert failed", err);
      apiError(409, "email_taken", "That email already has an account. Sign in instead.");
    }
    await db
      .update(inviteCodes)
      .set({ usedBy: payload.userId })
      .where(eq(inviteCodes.code, payload.inviteCode));
  }

  await db.insert(passkeys).values({
    id: credential.id,
    userId: payload.userId,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? null,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    createdAt: now,
  });
  await createSession(c, payload.userId);
  return c.json(await loadMe(c, payload.userId), 201);
});

// ---- Sign in with a passkey ---------------------------------------------

auth.post("/login/options", async (c) => {
  const { rpID } = relyingParty(c);
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  const challengeId = await storeChallenge(c, "login", options.challenge, null);
  return c.json({ challengeId, options });
});

auth.post("/login/verify", async (c) => {
  const { origin, rpID } = relyingParty(c);
  const body = await readJson(c, webauthnVerifyRequestSchema);
  const challenge = await consumeChallenge(c, body.challengeId, "login");
  const response = body.response as unknown as AuthenticationResponseJSON;

  const [passkey] = await c.var.db
    .select()
    .from(passkeys)
    .where(eq(passkeys.id, String(response.id)))
    .limit(1);
  if (!passkey) {
    apiError(400, "unknown_passkey", "This passkey isn't linked to an account here.");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.id,
      publicKey: isoBase64URL.toBuffer(passkey.publicKey),
      counter: passkey.counter,
      transports: passkey.transports ?? undefined,
    },
  }).catch((err: unknown) => {
    console.warn("passkey login failed", err);
    return apiError(400, "passkey_failed", "Could not verify the passkey. Please try again.");
  });
  if (!verification.verified) apiError(400, "passkey_failed", "Could not verify the passkey.");

  await c.var.db
    .update(passkeys)
    .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: Date.now() })
    .where(eq(passkeys.id, passkey.id));
  await createSession(c, passkey.userId);
  return c.json(await loadMe(c, passkey.userId));
});

// ---- Add a passkey to the signed-in account (e.g. a new phone) -----------

auth.post("/passkeys/options", requireUser, async (c) => {
  const { rpID, rpName } = relyingParty(c);
  const user = c.var.user!;
  const existing = await c.var.db
    .select({ id: passkeys.id, transports: passkeys.transports })
    .from(passkeys)
    .where(eq(passkeys.userId, user.id));
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email ?? user.displayName,
    userDisplayName: user.displayName,
    userID: userIdBytes(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports ?? undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  const challengeId = await storeChallenge(c, "add-passkey", options.challenge, user.id);
  return c.json({ challengeId, options });
});

auth.post("/passkeys/verify", requireUser, async (c) => {
  const { origin, rpID } = relyingParty(c);
  const user = c.var.user!;
  const body = await readJson(c, webauthnVerifyRequestSchema);
  const challenge = await consumeChallenge(c, body.challengeId, "add-passkey");
  if (challenge.userId !== user.id) apiError(403, "forbidden", "Challenge belongs to another user");

  const verification = await verifyRegistrationResponse({
    response: body.response as unknown as RegistrationResponseJSON,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  }).catch(() => apiError(400, "passkey_failed", "Could not verify the passkey."));
  if (!verification.verified) apiError(400, "passkey_failed", "Could not verify the passkey.");
  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  await c.var.db.insert(passkeys).values({
    id: credential.id,
    userId: user.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? null,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    createdAt: Date.now(),
  });
  return c.json(await loadMe(c, user.id), 201);
});

// ---- Email login link (fallback) ----------------------------------------

auth.post("/email/request", async (c) => {
  const origin = requestOrigin(c);
  if (!origin) apiError(403, "bad_origin", "Requests from this origin are not allowed");
  if (!emailLoginEnabled(c.env)) {
    apiError(503, "email_disabled", "Email sign-in isn't set up yet. Use your passkey.");
  }
  const { email } = await readJson(c, emailLoginRequestSchema);
  let devLink: string | undefined;

  const [user] = await c.var.db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user) {
    const now = Date.now();
    const [recent] = await c.var.db
      .select({ n: sql<number>`count(*)` })
      .from(emailLoginTokens)
      .where(and(eq(emailLoginTokens.userId, user.id), gt(emailLoginTokens.expiresAt, now)));
    if ((recent?.n ?? 0) < EMAIL_TOKENS_PER_WINDOW) {
      const token = randomToken();
      await c.var.db.insert(emailLoginTokens).values({
        id: await sha256Hex(token),
        userId: user.id,
        createdAt: now,
        expiresAt: now + EMAIL_TOKEN_TTL_MS,
      });
      const link = `${origin}/login/email#token=${token}`;
      await sendEmail(c.env, {
        to: email,
        subject: "Your Runhach sign-in link",
        text: `Hi ${user.displayName},\n\nTap to sign in to Runhach (valid for 15 minutes):\n${link}\n\nIf you didn't ask for this, ignore this email.`,
        html: `<p>Hi ${escapeHtml(user.displayName)},</p><p><a href="${link}">Tap here to sign in to Runhach</a> (valid for 15 minutes).</p><p>If you didn't ask for this, ignore this email.</p>`,
      });
      if (c.env.APP_ENV === "development") devLink = link;
    }
  }
  // Same response whether or not the account exists, so emails can't be probed.
  return c.json({ sent: true, ...(devLink && isLocalEnv(c.env) ? { devLink } : {}) });
});

auth.post("/email/verify", async (c) => {
  const { token } = await readJson(c, emailLoginVerifyRequestSchema);
  const now = Date.now();
  const [row] = await c.var.db
    .update(emailLoginTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(emailLoginTokens.id, await sha256Hex(token)),
        isNull(emailLoginTokens.usedAt),
        gt(emailLoginTokens.expiresAt, now),
      ),
    )
    .returning({ userId: emailLoginTokens.userId });
  if (!row) apiError(400, "link_expired", "This sign-in link expired or was already used.");
  await createSession(c, row.userId);
  return c.json(await loadMe(c, row.userId));
});

auth.post("/logout", async (c) => {
  await destroySession(c);
  return c.body(null, 204);
});

/** WebAuthn user handle for a user ID. */
function userIdBytes(id: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(id));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
