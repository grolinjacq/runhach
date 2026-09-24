import {
  PARTY_FEED_LIMIT,
  partyRunRequestSchema,
  type PartyActivity,
  type PartyMember,
  type PartyResponse,
} from "@runhach/shared";
import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { inviteCodes, runActivity, users } from "../db/schema";
import type { AppContext } from "../env";
import { iso, readJson } from "../lib/http";
import { requireUser } from "./me";

/**
 * A player's party is the invite graph, one hop each way: whoever's code they
 * used, plus everyone who used one of their codes.
 */
export const party = new Hono<AppContext>();

party.get("/party", requireUser, async (c) => {
  const db = c.var.db;
  const meId = c.var.user!.id;

  const inviterIds = db
    .select({ id: inviteCodes.createdBy })
    .from(inviteCodes)
    .where(eq(inviteCodes.usedBy, meId));
  const inviteeIds = db
    .select({ id: inviteCodes.usedBy })
    .from(inviteCodes)
    .where(eq(inviteCodes.createdBy, meId));

  const [inviters, invitees, rows] = await Promise.all([
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        usedAt: inviteCodes.usedAt,
        createdAt: users.createdAt,
      })
      .from(inviteCodes)
      .innerJoin(users, eq(users.id, inviteCodes.createdBy))
      .where(eq(inviteCodes.usedBy, meId)),
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        usedAt: inviteCodes.usedAt,
        createdAt: users.createdAt,
      })
      .from(inviteCodes)
      .innerJoin(users, eq(users.id, inviteCodes.usedBy))
      .where(eq(inviteCodes.createdBy, meId))
      .orderBy(desc(inviteCodes.usedAt)),
    db
      .select({
        id: runActivity.id,
        userId: runActivity.userId,
        displayName: users.displayName,
        distanceM: runActivity.distanceM,
        durationS: runActivity.durationS,
        xp: runActivity.xp,
        bestItemName: runActivity.bestItemName,
        bestItemRarity: runActivity.bestItemRarity,
        bestItemSlot: runActivity.bestItemSlot,
        bestItemBase: runActivity.bestItemBase,
        createdAt: runActivity.createdAt,
      })
      .from(runActivity)
      .innerJoin(users, eq(users.id, runActivity.userId))
      .where(
        or(
          eq(runActivity.userId, meId),
          inArray(runActivity.userId, inviterIds),
          inArray(runActivity.userId, inviteeIds),
        ),
      )
      .orderBy(desc(runActivity.createdAt), sql`"run_activity"."rowid" desc`)
      .limit(PARTY_FEED_LIMIT),
  ]);

  const members: PartyMember[] = [];
  const seen = new Set<string>([meId]);
  const add = (r: (typeof inviters)[number], relation: PartyMember["relation"]) => {
    if (seen.has(r.id)) return;
    seen.add(r.id);
    members.push({
      id: r.id,
      displayName: r.displayName,
      relation,
      joinedAt: iso(r.usedAt ?? r.createdAt),
    });
  };
  for (const r of inviters) add(r, "invited-you");
  for (const r of invitees) add(r, "you-invited");

  const feed: PartyActivity[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    displayName: r.displayName,
    isMe: r.userId === meId,
    distanceMeters: r.distanceM,
    durationSeconds: r.durationS,
    xp: r.xp,
    bestItem:
      r.bestItemName !== null && r.bestItemRarity !== null
        ? {
            name: r.bestItemName,
            rarity: r.bestItemRarity,
            slot: r.bestItemSlot ?? "",
            ...(r.bestItemBase !== null ? { base: r.bestItemBase } : {}),
          }
        : null,
    createdAt: iso(r.createdAt),
  }));

  const body: PartyResponse = { members, feed };
  return c.json(body);
});

party.post("/party/runs", requireUser, async (c) => {
  const body = await readJson(c, partyRunRequestSchema);
  const id = crypto.randomUUID();
  await c.var.db.insert(runActivity).values({
    id,
    userId: c.var.user!.id,
    distanceM: body.distanceMeters,
    durationS: body.durationSeconds,
    xp: body.xp,
    bestItemName: body.bestItem?.name ?? null,
    bestItemRarity: body.bestItem?.rarity ?? null,
    bestItemSlot: body.bestItem?.slot ?? null,
    bestItemBase: body.bestItem?.base ?? null,
    createdAt: Date.now(),
  });
  return c.json({ id }, 201);
});
