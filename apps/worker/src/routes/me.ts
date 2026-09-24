import {
  INVITES_PER_PLAYER,
  updateProfileRequestSchema,
  type Invite,
  type Me,
} from "@runhach/shared";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { Hono, type Context } from "hono";
import { createMiddleware } from "hono/factory";
import { inviteCodes, passkeys, users } from "../db/schema";
import type { AppContext } from "../env";
import { newInviteCode } from "../lib/crypto";
import { apiError, iso, readJson } from "../lib/http";

export const requireUser = createMiddleware<AppContext>(async (c, next) => {
  if (!c.var.user) apiError(401, "unauthenticated", "Please sign in.");
  await next();
});

export const requireAdmin = createMiddleware<AppContext>(async (c, next) => {
  if (!c.var.user) apiError(401, "unauthenticated", "Please sign in.");
  if (!c.var.user.isAdmin) apiError(403, "forbidden", "Admins only.");
  await next();
});

export async function loadMe(c: Context<AppContext>, userId: string): Promise<Me> {
  const [[row], [keys]] = await Promise.all([
    c.var.db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    c.var.db
      .select({ n: sql<number>`count(*)` })
      .from(passkeys)
      .where(eq(passkeys.userId, userId)),
  ]);
  if (!row) apiError(404, "not_found", "User not found");
  return { ...row, createdAt: iso(row.createdAt), passkeyCount: Number(keys?.n ?? 0) };
}

export const me = new Hono<AppContext>();

me.get("/me", requireUser, async (c) => c.json(await loadMe(c, c.var.user!.id)));

me.patch("/me", requireUser, async (c) => {
  const body = await readJson(c, updateProfileRequestSchema);
  await c.var.db
    .update(users)
    .set({ displayName: body.displayName })
    .where(eq(users.id, c.var.user!.id));
  return c.json(await loadMe(c, c.var.user!.id));
});

const invitee = alias(users, "invitee");

me.get("/invites", requireUser, async (c) => {
  const rows = await c.var.db
    .select({
      code: inviteCodes.code,
      createdAt: inviteCodes.createdAt,
      usedAt: inviteCodes.usedAt,
      usedByName: invitee.displayName,
    })
    .from(inviteCodes)
    .leftJoin(invitee, eq(invitee.id, inviteCodes.usedBy))
    .where(eq(inviteCodes.createdBy, c.var.user!.id))
    .orderBy(desc(inviteCodes.createdAt));
  const invites: Invite[] = rows.map((r) => ({
    code: r.code,
    createdAt: iso(r.createdAt),
    usedAt: r.usedAt === null ? null : iso(r.usedAt),
    usedByName: r.usedByName,
  }));
  return c.json({ invites, limit: c.var.user!.isAdmin ? null : INVITES_PER_PLAYER });
});

me.post("/invites", requireUser, async (c) => {
  const user = c.var.user!;
  if (!user.isAdmin) {
    const [row] = await c.var.db
      .select({ n: sql<number>`count(*)` })
      .from(inviteCodes)
      .where(eq(inviteCodes.createdBy, user.id));
    if (Number(row?.n ?? 0) >= INVITES_PER_PLAYER) {
      apiError(403, "invite_limit", `You can create up to ${INVITES_PER_PLAYER} invites.`);
    }
  }
  const invite = { code: newInviteCode(), createdBy: user.id, createdAt: Date.now() };
  await c.var.db.insert(inviteCodes).values(invite);
  const result: Invite = {
    code: invite.code,
    createdAt: iso(invite.createdAt),
    usedAt: null,
    usedByName: null,
  };
  return c.json(result, 201);
});
