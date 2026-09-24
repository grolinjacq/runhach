import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Timestamps are Unix epoch milliseconds.

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").unique(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

export const passkeys = sqliteTable(
  "passkeys",
  {
    /** WebAuthn credential ID (base64url). */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** COSE public key (base64url). */
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull(),
    transports: text("transports", { mode: "json" }).$type<string[]>(),
    deviceType: text("device_type"),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    lastUsedAt: integer("last_used_at"),
  },
  (t) => [index("passkeys_user_id_idx").on(t.userId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the session token; the token itself only lives in the cookie. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

/** Short-lived WebAuthn challenges, consumed on verification. */
export const authChallenges = sqliteTable("auth_challenges", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["register", "login", "add-passkey"] }).notNull(),
  challenge: text("challenge").notNull(),
  userId: text("user_id"),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
  expiresAt: integer("expires_at").notNull(),
});

export const emailLoginTokens = sqliteTable(
  "email_login_tokens",
  {
    /** SHA-256 of the emailed token. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
  },
  (t) => [index("email_login_tokens_user_id_idx").on(t.userId)],
);

export const inviteCodes = sqliteTable(
  "invite_codes",
  {
    code: text("code").primaryKey(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull(),
    usedBy: text("used_by").references(() => users.id, { onDelete: "set null" }),
    usedAt: integer("used_at"),
  },
  (t) => [index("invite_codes_created_by_idx").on(t.createdBy)],
);

export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  buildVersion: text("build_version").notNull(),
  route: text("route").notNull(),
  userAgent: text("user_agent"),
  context: text("context", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at").notNull(),
});

/** Finished runs shared with the player's party feed. */
export const runActivity = sqliteTable(
  "run_activity",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    distanceM: integer("distance_m").notNull(),
    durationS: integer("duration_s").notNull(),
    xp: integer("xp").notNull(),
    bestItemName: text("best_item_name"),
    bestItemRarity: text("best_item_rarity", {
      enum: ["common", "uncommon", "rare", "epic", "legendary"],
    }),
    bestItemSlot: text("best_item_slot"),
    bestItemBase: text("best_item_base"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("run_activity_user_id_idx").on(t.userId)],
);
