import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sessions, users } from "../db/schema";
import type { AppContext, SessionUser } from "../env";
import { randomToken, sha256Hex } from "./crypto";

export const SESSION_COOKIE = "rh_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Extend the session when less than this much time is left. */
const SESSION_REFRESH_MS = 15 * 24 * 60 * 60 * 1000;

function cookieOptions(c: Context<AppContext>, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(c: Context<AppContext>, userId: string): Promise<void> {
  const token = randomToken();
  const now = Date.now();
  await c.var.db.insert(sessions).values({
    id: await sha256Hex(token),
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    userAgent: c.req.header("User-Agent")?.slice(0, 300) ?? null,
  });
  setCookie(c, SESSION_COOKIE, token, cookieOptions(c, SESSION_TTL_MS / 1000));
}

/** Resolves the signed-in user from the session cookie, refreshing it when due. */
export async function loadSession(
  c: Context<AppContext>,
): Promise<{ user: SessionUser; sessionId: string } | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const sessionId = await sha256Hex(token);
  const [row] = await c.var.db
    .select({
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const now = Date.now();
  if (!row || row.expiresAt <= now) {
    if (row) await c.var.db.delete(sessions).where(eq(sessions.id, sessionId));
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return null;
  }
  if (row.expiresAt - now < SESSION_REFRESH_MS) {
    await c.var.db
      .update(sessions)
      .set({ expiresAt: now + SESSION_TTL_MS })
      .where(eq(sessions.id, sessionId));
    setCookie(c, SESSION_COOKIE, token, cookieOptions(c, SESSION_TTL_MS / 1000));
  }
  return { user: row.user, sessionId };
}

export async function destroySession(c: Context<AppContext>): Promise<void> {
  if (c.var.sessionId) {
    await c.var.db.delete(sessions).where(eq(sessions.id, c.var.sessionId));
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
