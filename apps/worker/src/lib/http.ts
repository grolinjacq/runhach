import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";

/** Throws a JSON API error: `{ error: { code, message } }`. */
export function apiError(status: ContentfulStatusCode, code: string, message: string): never {
  throw new HTTPException(status, {
    res: Response.json({ error: { code, message } }, { status }),
  });
}

/** Parses and validates a JSON request body against a zod schema. */
export async function readJson<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    apiError(400, "invalid_json", "Request body must be JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".");
    apiError(400, "invalid_request", `${path ? `${path}: ` : ""}${issue?.message ?? "Invalid"}`);
  }
  return result.data;
}

export const iso = (ms: number) => new Date(ms).toISOString();
