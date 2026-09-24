# Runhach — Architecture

> Status: **Draft v1**. Phase 0 turns this into a working skeleton; details may shift as it's built.

## Overview

```
 Phone (PWA, React + Vite)                       Cloudflare
 ┌─────────────────────────────┐                 ┌───────────────────────────────────────┐
 │ UI (pixel-art, i18n)        │   HTTPS /api    │ Worker (Hono)                         │
 │ Run engine: GPS, wake lock, │ ──────────────► │  • auth (passkeys, email link)        │
 │   voice/sound/vibration     │                 │  • runs, loot, inventory, skills      │
 │ IndexedDB: live run + queue │                 │  • teams, quests, leaderboards        │
 │ packages/game (shared) ─────┼──── same code ──┼─► packages/game (authoritative)       │
 └─────────────┬───────────────┘                 │  • serves the built PWA (static assets)│
               │  WebSocket (during raids)       ├───────────────────────────────────────┤
               └───────────────────────────────► │ Durable Object: RaidRoom (1 per raid) │
                                                 │  live boss HP, who's running, synergy │
                                                 ├───────────────────────────────────────┤
                                                 │ D1 (SQLite): users, runs, items, ...  │
                                                 └───────────────────────────────────────┘
```

**A single Worker** serves both the web app files and the `/api` routes, with the Durable Object classes deployed alongside. Because everything shares one origin, there are no cross-origin (CORS) problems, cookies stay simple, and passkeys have a single domain to belong to.

## Repository layout (monorepo, pnpm workspaces)

```
apps/
  web/        React + Vite + TypeScript PWA (vite-plugin-pwa, React Router, TanStack Query, react-i18next)
  worker/     Cloudflare Worker: Hono API, Durable Objects, D1 migrations (Drizzle ORM)
packages/
  game/       Pure TypeScript game logic, no browser or Worker APIs:
              seeded random numbers, balance config, XP/levels, effort multiplier,
              loot tables and rolls, style scores, damage, run validation
  shared/     API contracts (zod schemas + types) shared by web and worker
docs/         Spec, architecture, roadmap
```

The key design choice is **`packages/game`**. The same code runs on the phone, to announce loot and damage live even offline, and on the server, which re-runs it on submission and has the final say. All balance numbers live in one `balance.ts` file, so tuning between test batches is a one-file change.

## Tech choices

| Concern | Choice | Why |
|---|---|---|
| UI | React 19 + Vite + TypeScript (strict) | Largest ecosystem; easy to wrap with Capacitor later |
| PWA | vite-plugin-pwa (Workbox) | Installable, offline shell, update prompts |
| Local storage | IndexedDB (via Dexie) | Crash-safe in-progress runs and an upload queue |
| API | Hono on Cloudflare Workers | Small, typed, built for Workers |
| Database | Cloudflare D1 + Drizzle ORM + wrangler migrations | Relational data (inventories, teams) with typed queries |
| Live raids | Durable Objects + hibernating WebSockets | One object per raid holds live boss HP and fans out updates cheaply |
| Auth | Passkeys (@simplewebauthn) + emailed login link; session in an HTTP-only cookie stored in D1 | No passwords; the invite code gates sign-up |
| Email | Resend (proposed) | Login-link emails. In dev, links are logged to the console |
| Maps (private route view) | MapLibre or Leaflet with OpenStreetMap-based tiles | Free for beta scale; tile provider decided in Phase 1 |
| Tests | Vitest (unit), `@cloudflare/vitest-pool-workers` (API + D1 + Durable Object integration), Playwright (end-to-end with **GPS replay**) | Every phase can be tested without going for a run |
| CI/CD | GitHub Actions + wrangler | Checks on every PR, a preview URL per PR, production deploy on merge |

## Data model (first sketch)

| Table | Key columns |
|---|---|
| `users` | id, display_name, email, created_at |
| `passkeys` | id, user_id, public_key, counter, transports |
| `sessions` | id, user_id, expires_at |
| `invite_codes` | code, created_by, uses_left |
| `characters` | user_id, level, xp, gold, unspent_points, cosmetic_loadout |
| `skill_allocations` | user_id, skill_id, rank |
| `runs` | id, user_id, started_at, ended_at, distance_m, moving_time_s, seed, status (`active` / `submitted` / `validated` / `flagged`), raid_id, metrics_json |
| `run_splits` | run_id, km_index, duration_s |
| `run_routes` | run_id, encoded_polyline (**readable by the owner only**) |
| `items` | id, owner_id, base_id, rarity, item_level, stats_json, equipped_slot, source_run_id |
| `teams` / `team_members` / `team_invites` | team id, name; membership and join time; invite token and expiry |
| `raids` / `raid_contributions` | boss_id, team_id, window start and end, hp_max, hp_left, status; damage and run count per user |
| `quests`, `achievements`, `streaks` | per-user progress |

Static game content (item bases, skills, bosses, quests) lives **in code** in `packages/game`, not in the database, so it's version-controlled and reviewable.

## Run lifecycle

1. **Start:** the phone calls `POST /api/runs`. The server creates an `active` run and returns a **seed** (plus a raid connection if a raid is active).
2. **Running:** GPS points are filtered and saved to IndexedDB. At each km, `packages/game` rolls a chest from the seed and announces it. During a raid, the phone sends per-km damage to the `RaidRoom` over its WebSocket. The raid room applies the damage provisionally, broadcasts the boss's health, and detects teammates running at the same time for the synergy bonus.
3. **Stop:** the phone uploads the whole track (with retries from the queue).
4. **Validate:** the server re-runs the anti-cheat checks and recomputes the metrics, loot and damage with the same seed. Then it commits the XP, items and gold, and reconciles the raid's damage with what the raid room applied provisionally.

## Environments

| Environment | Where | Database |
|---|---|---|
| Local | `wrangler dev` / Vite dev server | Local D1 (in a file) |
| Preview | A per-PR preview URL from `wrangler versions upload` | Preview D1 |
| Production (the beta) | `*.workers.dev` or a custom domain | Production D1 |

**One-time setup you'll need to do:** create a Cloudflare account and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets in the repo. Before email login goes live, add a `RESEND_API_KEY`. The Workers Free plan should cover a friends beta. The $5/month paid plan is only needed if we hit its limits.

## Later: native wrap (Capacitor)

The same `apps/web` build gets packaged with Capacitor for iOS and Android. That adds background GPS (runs with the screen locked), native vibration on iPhone, and push notifications. It needs an Apple Developer account ($99/year) and a Google Play account ($25 one-time).
