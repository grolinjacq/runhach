import { exports } from "cloudflare:workers";
import { env } from "cloudflare:workers";

export const ORIGIN = "http://example.com";

/** Calls the worker like a same-origin browser would. */
export function api(path: string, init: RequestInit & { cookie?: string } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.method && init.method !== "GET" && !headers.has("Origin")) headers.set("Origin", ORIGIN);
  if (init.cookie) headers.set("Cookie", init.cookie);
  return exports.default.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }));
}

/** Extracts "name=value" from a Set-Cookie header. */
export function sessionCookie(res: Response): string {
  const setCookie = res.headers.get("Set-Cookie") ?? "";
  const match = /rh_session=[^;]+/.exec(setCookie);
  if (!match) throw new Error(`No session cookie in: ${setCookie}`);
  return match[0];
}

export async function insertUser(opts: {
  id?: string;
  displayName?: string;
  email?: string;
  isAdmin?: boolean;
}) {
  const user = {
    id: opts.id ?? crypto.randomUUID(),
    displayName: opts.displayName ?? "Runner",
    email: opts.email ?? `${crypto.randomUUID()}@example.com`,
    isAdmin: opts.isAdmin ?? false,
  };
  await env.DB.prepare(
    "INSERT INTO users (id, display_name, email, is_admin, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(user.id, user.displayName, user.email, user.isAdmin ? 1 : 0, Date.now())
    .run();
  return user;
}
