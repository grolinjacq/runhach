import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "./db/schema";

/** Bindings from wrangler.jsonc plus optional secrets. */
export type Bindings = Env & {
  /** Set with `wrangler secret put RESEND_API_KEY` to enable email login links. */
  RESEND_API_KEY?: string;
};

export interface SessionUser {
  id: string;
  displayName: string;
  email: string | null;
  isAdmin: boolean;
  createdAt: number;
}

export type AppContext = {
  Bindings: Bindings;
  Variables: {
    db: DrizzleD1Database<typeof schema>;
    user: SessionUser | null;
    sessionId: string | null;
  };
};
