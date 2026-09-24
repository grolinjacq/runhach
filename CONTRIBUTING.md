# Contributing to Runhach

## Requirements

- Node.js 22 (`.nvmrc`) and pnpm 10 (`corepack enable` installs the version pinned in `package.json`)

## Run it locally

```sh
pnpm install
pnpm dev
```

This applies the database migrations to a local D1 and starts two servers:

| URL                   | What                                                       |
| --------------------- | ---------------------------------------------------------- |
| http://localhost:5173 | The web app (Vite, hot reload). Open this one.             |
| http://localhost:8787 | The Worker API (`wrangler dev`). Vite proxies `/api` here. |

Local development specifics:

- **The first account needs no invite code** and becomes the admin. Later sign-ups need a code from **Invite friends**.
- **Email login links aren't emailed locally.** The sign-in page shows the link, and it's also printed in the Worker's console.
- **Passkeys work on `localhost`**, using your computer's Touch ID or Windows Hello, or a phone via QR code.
- **The GPS lab** (`/dev/gps`) is available in dev and preview builds. It tracks real GPS, a simulated run at any pace, or a replayed GPX file (try `e2e/fixtures/park-loop-1km.gpx`).

To try it on your phone on the same Wi-Fi, run `pnpm --filter @runhach/web dev --host`. Note that browsers only allow GPS, passkeys and wake lock over HTTPS or on `localhost`, so for phone testing, use a preview deployment instead.

## Checks

```sh
pnpm check      # lint + format check + typecheck + unit & API tests
pnpm test:e2e   # Playwright end-to-end tests (builds the app, starts a fresh local stack)
```

| What                       | Where                           | Runs in                                                                      |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| Game logic unit tests      | `packages/game/src/*.test.ts`   | Node (Vitest)                                                                |
| API contract tests         | `packages/shared/src/*.test.ts` | Node (Vitest)                                                                |
| API + database + live room | `apps/worker/test/*.test.ts`    | The real Workers runtime with a local D1 (`@cloudflare/vitest-pool-workers`) |
| End-to-end                 | `e2e/tests/*.spec.ts`           | Chromium with a virtual passkey authenticator and emulated GPS               |

The end-to-end tests never need a real run. They feed GPS positions from GPX fixtures (`e2e/fixtures/`). You can regenerate the fixtures with `cd e2e && npx tsx scripts/make-fixtures.ts`.

## Changing things

- **Game numbers** (XP, drop rates, anti-cheat limits, raid settings) live only in `packages/game/src/balance.ts`. Bump `BALANCE_VERSION` when you change one.
- **Text** lives in `apps/web/src/i18n/locales/en.json`. Never hard-code user-facing strings in components.
- **Database schema:** edit `apps/worker/src/db/schema.ts`, then run `pnpm --filter @runhach/worker db:generate` to create a migration in `apps/worker/migrations/`. Migrations apply automatically on deploy.
- **Bindings** (`apps/worker/wrangler.jsonc`): after changing them, run `pnpm --filter @runhach/worker cf-typegen` to refresh the `Env` types.

## Deployments

| Branch       | Deploys to                                                            | Database             |
| ------------ | --------------------------------------------------------------------- | -------------------- |
| Pull request | `runhach-preview` Worker (URL posted as a PR comment), with dev tools | `runhach-db-preview` |
| `main`       | `runhach` Worker (the beta)                                           | `runhach-db`         |

Deploys run in GitHub Actions (`.github/workflows/deploy.yml`). The first deploy creates the D1 databases.

### One-time setup

1. **Cloudflare API token:** in the dashboard, go to **My Profile → API Tokens → Create Token** and use the **"Edit Cloudflare Workers"** template. Add **Account → D1 → Edit**, set Account Resources to your account and Zone Resources to All zones, then create the token.
2. **GitHub secrets:** in the repo, go to **Settings → Secrets and variables → Actions** and add:
   - `CLOUDFLARE_API_TOKEN`: the token from step 1
   - `CLOUDFLARE_ACCOUNT_ID`: from the dashboard URL (`dash.cloudflare.com/<account id>/…`)
3. The account needs a `workers.dev` subdomain. Opening **Workers & Pages** once in the dashboard sets one up.

Until those secrets exist, the deploy job skips with a notice instead of failing.

**After the first production deploy, sign up right away:** the first account on a fresh database becomes the admin and needs no invite code.

### Optional: email login links

Email login needs a sending domain. With [Resend](https://resend.com):

1. Verify your domain in Resend and create an API key.
2. In GitHub, add the secret `RESEND_API_KEY` and the variable `EMAIL_FROM` (e.g. `Runhach <login@yourdomain.com>`), both under **Settings → Secrets and variables → Actions**.

The next deploy picks them up. Until then, the sign-in page tells people to use their passkey.
