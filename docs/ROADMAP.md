# Runhach — Roadmap

Each phase is **independently testable**. A phase ships as one or more PRs, and each PR gets its own preview URL. After a phase merges, it deploys to the beta, a **test batch** of real users tries it, and the feedback goes into balance tweaks and fixes before the next phase starts.

```
P0 Foundation ─► P1 Run tracking ─► P2 XP & loot ─► P3 Skill tree ─► P4 Teams ─► P5 Bosses & raids ─► P6 Quests & leaderboards ─► P7 Native wrap & imports ─► P8 Beta hardening
```

| Phase | Theme                                       | Testers                              | Rough size   |
| ----- | ------------------------------------------- | ------------------------------------ | ------------ |
| 0     | Foundation                                  | You                                  | M            |
| 1     | Run tracking                                | You + 2–3 friends                    | M            |
| 2     | XP, levels & loot                           | Friends, 1–2 weeks                   | L            |
| 3     | Skill tree & classes                        | Friends                              | M            |
| 4     | Teams & social                              | Friends in teams                     | M            |
| 5     | Bosses & raids                              | Teams + solo players, 1–2 raid weeks | XL (5a / 5b) |
| 6     | Quests, streaks, achievements, leaderboards | Everyone                             | M            |
| 7     | Native wrap & imports                       | Everyone on iOS/Android builds       | L            |
| 8     | Beta hardening                              | Wider friends circle                 | M            |

---

## Phase 0 — Foundation

> **Status: built.** Waiting for the Cloudflare secrets so it can deploy, then for test batch 0.

**Goal:** a deployed, installable, signed-in empty shell with all the plumbing every later phase depends on. No gameplay yet.

**Scope**

- Monorepo: pnpm workspaces, strict TypeScript, ESLint + Prettier, Vitest.
- `apps/web`: a React + Vite PWA (manifest, icons, service worker, install prompt), routing, react-i18next with English locale files, and a base pixel-art theme (font, palette, buttons, panels, dialogs).
- `apps/worker`: Hono API, D1 + Drizzle + the first migration, `/api/health`, serving the built web app, and a **`RaidRoom` Durable Object stub** (a WebSocket echo that proves the live channel works end to end).
- **Auth:** invite-code sign-up, passkey registration and login, emailed login link as fallback (links are logged in dev), sessions, logout, and a basic profile (display name).
- `packages/game`: skeleton with seeded random numbers, `balance.ts`, and the first unit tests. `packages/shared`: zod API contracts.
- **Device check screen:** reports GPS permission and accuracy, wake lock, speech, sound and vibration support on this phone.
- **GPS test harness:** a fake location source, GPX replay fixtures for Playwright, and a dev-only "simulated run" toggle (hidden in production).
- **In-app build/version badge** and a **feedback button** (stored in D1), so testers can report which build they were on.
- **CI/CD:** lint, typecheck, tests and build on every PR; a preview deploy per PR; a production deploy on merge; separate preview and production D1 databases.
- `CONTRIBUTING.md`: how to run locally, how to test a phase, and how to add a balance value.

**Test batch 0 — you**

- [ ] Open the beta URL on your phone and install it to the home screen.
- [ ] Sign up with an invite code and create a passkey.
- [ ] Sign in on a second device with an emailed login link, then add a passkey there.
- [ ] Run the device check on iPhone and Android and note the results.
- [ ] Send a test message with the feedback button.

**Exit criteria:** CI and deploys are green, and sign-up and sign-in work on iOS and Android. The device check confirms wake lock and GPS on the test phones.

## Phase 1 — Run tracking

**Goal:** a trustworthy (if plain) running tracker. Every later phase is built on this data.

**Scope**

- Start, pause, resume and stop, with auto-pause. A **wake-locked, dark run screen** with big numbers.
- GPS filtering and smoothing. Distance, moving time, pace, per-km splits, consistency, negative split and surge detection (in `packages/game`).
- Crash-safe local saving (IndexedDB), an upload queue, and resuming an interrupted run.
- **Voice** kilometer announcements (distance, split pace) plus a sound effect.
- Run history and run detail, with stats, splits and a **private route map**.
- Server-side validation: speed cap, GPS jumps, timestamp checks, and flagging.
- **Account deletion** (routes are now stored) and a short privacy notice.

**Test batch 1 — you + 2–3 friends, at least 3 real runs each**

- [ ] Compare distance against a watch or Strava. Target: within ±3%.
- [ ] Measure battery drain per 30 minutes with the screen on.
- [ ] Kill the app mid-run, reopen it, and confirm the run resumes.
- [ ] Go for a bike ride and confirm the run gets flagged.

**Exit criteria:** accurate enough, no lost runs, and battery drain is acceptable.

## Phase 2 — XP, levels & loot (the solo game loop)

**Goal:** running feels rewarding on its own.

**Scope**

- Character creation (name plus a pixel avatar), XP, levels and gold.
- **Personal baseline**, 3 calibration runs, and the **effort multiplier** (pace, distance, consistency, negative split; the streak bonus arrives in Phase 6). Shown on the run summary.
- **Per-km chests** announced live (voice + sound + vibration), rolled from the server's seed and confirmed by the server. A post-run **loot reveal ceremony**.
- Item catalog (Weapon, Armor, Boots, Trinket; 5 rarities; Strength, Dexterity, Intellect and Luck stats; a few Legendary effects), inventory, equipping, and bad-luck protection.
- Cosmetics: avatar colors and outfits, and titles.

**Test batch 2 — friends, 1–2 weeks of normal running**

- [ ] Does loot feel exciting for both slow and fast runners?
- [ ] Check drop rates against the targets and tune them in `balance.ts`.
- [ ] Look at the effort multipliers people actually hit.

**Exit criteria:** testers want to open their chests, and the drop rates are tuned.

## Phase 3 — Skill tree & classes

**Goal:** players shape their identity as Warrior, Archer, Mage, or a generalist.

**Scope**

- Per-km **style scores** (Speed, Rhythm, Endurance) shown on the run summary.
- A 3-branch skill tree with tiers and **capstones**, skill points from levels, a **gold-cost respec**, and a class title derived from where points are spent.
- Skill effects wired into the multipliers now (luck, XP). Damage effects are computed and previewed ("this run would have dealt…") ahead of Phase 5.

**Test batch 3**

- [ ] Do the style scores match how people feel they ran (fast, steady or long)?
- [ ] Are people choosing different builds?

**Exit criteria:** the style scores feel fair, and the skill choices feel meaningful.

## Phase 4 — Teams & social

**Goal:** friends are connected and can see each other's progress.

**Scope**

- Create a team (up to 4), invite by **link** and **friend code**, and join or leave at any time.
- Teammate profiles (**stats only, never routes**) and a team feed (runs, big drops, level-ups).
- Web push notifications on supported devices: "Mira just started running" and "you've been invited".

**Test batch 4**

- [ ] Form teams across iPhone and Android using both invite methods.
- [ ] Confirm that routes never leak to teammates.

**Exit criteria:** invite and join work reliably, and privacy checks pass.

## Phase 5 — Bosses & raids

**Goal:** the core co-op fantasy. Beat bosses together, and only while running.

**5a — Raids (not yet live)**

- The Act 1 bestiary (4–5 bosses) with weaknesses, resistances and mechanics. Start a raid with a 7-day window.
- Per-km damage from style scores × skill tree × gear × boss modifiers, applied when a run is submitted.
- Joining mid-raid, victory and failure, contribution-based rewards, solo raids, and the recommended level shown for solo and team play.

**5b — Live raids**

- A `RaidRoom` Durable Object per raid, with a live boss health bar on the run screen over WebSocket.
- A **live synergy bonus** when teammates run at the same time, with voice callouts ("Boss at 40%!", "Mira joined the fight!").
- Reconciling live (provisional) damage with the server-confirmed damage.

**Test batch 5 — 1–2 raid weeks**

- [ ] At least one full team and one solo player each attempt a boss.
- [ ] Tune boss health, the window length and damage so a team at the recommended level wins with some margin, and a solo player at the same level doesn't.
- [ ] Two teammates run at the same time and confirm the synergy bonus appears live.

**Exit criteria:** raids are winnable but challenging, and teams clearly beat solo play at the same level.

## Phase 6 — Quests, streaks, achievements, leaderboards

**Scope:** daily and weekly quests, **weekly** streaks (plus the streak bonus in the effort multiplier), achievements and badges, and friend and team leaderboards (weekly distance, raid damage, **improvement vs baseline**).

**Test batch 6:** is there a reason to open the app on days you don't raid? Is the quest difficulty right?

## Phase 7 — Native wrap & imports

**Scope**

- A Capacitor build for iOS (via TestFlight) and Android (internal testing track). **Background GPS** so runs continue with the screen locked, native vibration on iPhone, and native push notifications.
- Imports from Strava, Apple Health, Health Connect or Garmin. The treadmill and indoor decision and "do imported runs deal boss damage?" get revisited here.

**Test batch 7:** a phone-in-pocket run with the screen locked. Accuracy matches Phase 1 or better.

## Phase 8 — Beta hardening

**Scope:** data export, stricter anti-cheat if needed, admin tools (reviewing flagged runs, managing invite codes), performance and battery work, error monitoring, and polishing the art and sound.

---

## How each test batch runs

1. The phase's PRs are reviewed on their **preview URLs**, then merged. The beta URL updates automatically.
2. Testers get a short checklist (the one in each phase above).
3. Feedback arrives through the in-app feedback button (tagged with the build version) and through GitHub issues.
4. Balance changes land as small `balance.ts` PRs. Bugs are fixed before the next phase starts.
