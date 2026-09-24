import type { Context } from "hono";
import type { AppContext } from "../env";

/** Origins allowed to call the API: the worker's own origin plus EXTRA_ORIGINS (dev). */
export function allowedOrigins(c: Context<AppContext>): string[] {
  const own = new URL(c.req.url).origin;
  const extra = (c.env.EXTRA_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [own, ...extra];
}

/**
 * The browser origin a request came from, if it is allowed. WebAuthn binds
 * passkeys to this origin's hostname (the "relying party ID").
 */
export function requestOrigin(c: Context<AppContext>): string | null {
  const origin = c.req.header("Origin") ?? new URL(c.req.url).origin;
  return allowedOrigins(c).includes(origin) ? origin : null;
}
