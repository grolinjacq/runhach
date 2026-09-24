import type { HealthResponse } from "@runhach/shared";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as schema from "./db/schema";
import type { AppContext } from "./env";
import { apiError } from "./lib/http";
import { allowedOrigins } from "./lib/origin";
import { loadSession } from "./lib/session";
import { auth } from "./routes/auth";
import { feedbackRoutes } from "./routes/feedback";
import { me } from "./routes/me";

export { RaidRoom } from "./raid-room";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const api = new Hono<AppContext>();

api.use(async (c, next) => {
  c.set("db", drizzle(c.env.DB, { schema }));
  // Browsers always send Origin on state-changing requests; reject other sites (CSRF).
  if (!SAFE_METHODS.has(c.req.method)) {
    const origin = c.req.header("Origin");
    if (origin && !allowedOrigins(c).includes(origin)) {
      apiError(403, "bad_origin", "Requests from this origin are not allowed");
    }
  }
  const session = await loadSession(c);
  c.set("user", session?.user ?? null);
  c.set("sessionId", session?.sessionId ?? null);
  await next();
});

api.get("/health", (c) => {
  const body: HealthResponse = {
    ok: true,
    env: c.env.APP_ENV,
    version: c.env.BUILD_VERSION,
    time: new Date().toISOString(),
  };
  return c.json(body);
});

api.route("/auth", auth);
api.route("/", me);
api.route("/", feedbackRoutes);

// Live channel test used by the device check screen.
api.get("/live/echo", (c) => {
  const stub = c.env.RAID_ROOM.get(c.env.RAID_ROOM.idFromName("device-check"));
  return stub.fetch(c.req.raw);
});

// Explicit catch-all: a mounted sub-app's notFound() never fires, because the
// parent's asset fallback below would match first.
api.all("*", (c) => c.json({ error: { code: "not_found", message: "No such endpoint" } }, 404));

api.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error("unhandled error", err);
  return c.json({ error: { code: "internal", message: "Something went wrong" } }, 500);
});

const app = new Hono<AppContext>();
app.route("/api", api);
// Everything else is the web app (normally served by static assets before the worker runs).
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app satisfies ExportedHandler<Env>;
