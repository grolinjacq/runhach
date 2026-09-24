import { feedbackRequestSchema, type FeedbackItem } from "@runhach/shared";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { feedback, users } from "../db/schema";
import type { AppContext } from "../env";
import { iso, readJson } from "../lib/http";
import { requireAdmin } from "./me";

export const feedbackRoutes = new Hono<AppContext>();

// Signed-out testers can send feedback too (e.g. "sign-up fails on my phone").
feedbackRoutes.post("/feedback", async (c) => {
  const body = await readJson(c, feedbackRequestSchema);
  const id = crypto.randomUUID();
  await c.var.db.insert(feedback).values({
    id,
    userId: c.var.user?.id ?? null,
    message: body.message,
    buildVersion: body.buildVersion,
    route: body.route,
    userAgent: c.req.header("User-Agent")?.slice(0, 300) ?? null,
    context: body.context ?? null,
    createdAt: Date.now(),
  });
  return c.json({ id }, 201);
});

feedbackRoutes.get("/admin/feedback", requireAdmin, async (c) => {
  const rows = await c.var.db
    .select({
      id: feedback.id,
      message: feedback.message,
      buildVersion: feedback.buildVersion,
      route: feedback.route,
      userAgent: feedback.userAgent,
      context: feedback.context,
      createdAt: feedback.createdAt,
      userName: users.displayName,
    })
    .from(feedback)
    .leftJoin(users, eq(users.id, feedback.userId))
    .orderBy(desc(feedback.createdAt))
    .limit(100);
  const items: FeedbackItem[] = rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
  return c.json({ items });
});
