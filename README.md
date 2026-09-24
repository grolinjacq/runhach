# Runhach

_Working title._ A running RPG: every kilometer you run earns XP and loot, and teams of friends fight bosses together — but only while they're actually running.

- **Web app (PWA)** — React + Vite + TypeScript, pixel-art fantasy style
- **Backend** — Cloudflare Workers, D1, Durable Objects
- **Status** — Phase 0 (foundation) built: sign-up with passkeys, invites, device check, GPS lab, CI/CD

## Quick start

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm check      # lint, types, unit & API tests
pnpm test:e2e   # end-to-end tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development, testing and deployment setup.

## Repo layout

```
apps/web        React PWA (the game client)
apps/worker     Cloudflare Worker: API, D1 database, Durable Objects
packages/game   Shared game logic: balance numbers, seeded dice, GPS math
packages/shared API contracts (zod schemas)
e2e             Playwright tests + GPX fixtures
docs            Spec, architecture, roadmap
```

## Docs

| Doc                                  | What's in it                                                             |
| ------------------------------------ | ------------------------------------------------------------------------ |
| [Product spec](docs/PRODUCT_SPEC.md) | Kickoff decisions, game design, starting balance numbers, open questions |
| [Architecture](docs/ARCHITECTURE.md) | Stack, repo layout, data model, run lifecycle, environments              |
| [Roadmap](docs/ROADMAP.md)           | Phases 0–8, each with scope, a test-batch checklist and exit criteria    |
