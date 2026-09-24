# Runhach — Product Spec

> Status: **Draft v1**, from the kickoff interview on 2026-09-24.
> Every number in this document is a _starting value_ that lives in one balance config file and gets tuned between test batches.

## 1. Vision

A running app that feels like an RPG. Every kilometer you run earns experience and has a chance to drop loot. Running faster, farther or more steadily than _your own_ usual improves your odds. Players grow a character through a skill tree with three branches: **Warrior**, **Archer** and **Mage**. Each branch is powered by a different running style. Bosses are weak to certain styles, so a mixed team of friends beats them far more easily than a solo player. Solo is possible, but the player needs more levels and more runs. **You can only damage a boss while you are running.**

Target for now: a **private beta with friends**, built and tested phase by phase (see [ROADMAP.md](./ROADMAP.md)).

## 2. Decision log (kickoff interview)

| Topic                    | Decision                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform                 | **Web app (PWA)** first. Later, the same code gets wrapped with Capacitor for native iOS/Android.                                                                                     |
| Screen-lock problem      | While running, the app keeps the screen on (Screen Wake Lock) with a dark, battery-friendly run screen. The native wrap in a later phase adds true background GPS.                    |
| Run recording            | **In-app GPS.** Imports from Strava, Apple Health or Garmin come in a later phase.                                                                                                    |
| Backend                  | **Cloudflare**: Workers, D1 (SQL database) and Durable Objects (live raid rooms).                                                                                                     |
| Goal                     | **Private beta with friends.**                                                                                                                                                        |
| Front end                | **React + Vite + TypeScript**.                                                                                                                                                        |
| Login                    | **Passkeys** (Face ID or fingerprint) with an **emailed login link** as fallback. The beta is invite-only.                                                                            |
| Boss fights              | **Raid window + live bonus.** A boss stays open for several days. Each teammate's runs deal damage whenever they run, and running at the same time as teammates adds a synergy bonus. |
| Classes                  | **Skill-tree branches, not locked classes.** As you level up you can stay a generalist or specialize.                                                                                 |
| Class strengths          | **Running style.** Warrior = speed and intervals, Archer = steady pace, Mage = distance and endurance.                                                                                |
| Specialist vs generalist | Specialists unlock powerful **capstone** abilities. Generalists have flexible, smaller bonuses and find solo play easier.                                                             |
| Respec                   | Allowed, but **costs in-game gold**.                                                                                                                                                  |
| Multiplier fairness      | Measured against your **personal baseline**, not absolute pace.                                                                                                                       |
| Loot                     | **Stat gear + cosmetics.**                                                                                                                                                            |
| Team size                | **Up to 4.**                                                                                                                                                                          |
| Joining                  | Friends can join **at any time, including in the middle of a raid**. The boss's health doesn't reset.                                                                                 |
| Anti-cheat               | **Basic checks**: speed caps and GPS-jump detection. Suspicious runs get flagged.                                                                                                     |
| Extras                   | **Quests + streaks** and **achievements + leaderboards**. No crafting or pets for now.                                                                                                |
| Art style                | **Pixel-art fantasy.**                                                                                                                                                                |
| Language                 | **English, translation-ready** (all text in locale files from day one).                                                                                                               |
| In-run feedback          | **Voice + sounds + vibration.**                                                                                                                                                       |
| Route privacy            | **Only the runner sees their GPS route.** Teammates see stats only.                                                                                                                   |
| Treadmill / indoor       | **Not in the beta.** To be revisited when imports arrive.                                                                                                                             |
| Deployment               | **Cloudflare, auto-deployed from GitHub.**                                                                                                                                            |

## 3. Core loop

```
Run ──► every km: XP + a loot chest (rarity boosted by your effort multiplier)
 │
 ├──► during an active raid: every km also deals damage to your team's boss
 │        (more when your running style matches the boss's weakness,
 │         more again when teammates are running at the same time)
 │
 └──► after the run: open chests, equip gear, spend skill points,
          progress quests and streaks, check the raid status
```

## 4. Run tracking

- **GPS** through the browser's Geolocation API in high-accuracy mode. Weak fixes (accuracy worse than about 30 m) are dropped, the track is smoothed, and the run auto-pauses when you stop moving.
- **Screen stays on** during runs (Screen Wake Lock), on a dark, low-redraw screen with big numbers. Known limit: if the runner switches to another app, GPS stops. That's fixed by the native wrap (see the roadmap).
- **Crash-safe:** an in-progress run is saved continuously on the phone (IndexedDB). A reload or crash doesn't lose it, and it uploads when the phone is online.
- **Metrics per run:** distance, moving time, average pace, per-km splits, fastest km, pace consistency (how much the km splits vary), negative split (second half faster than the first), and surges (intervals).
- **Device check screen:** reports whether this phone supports GPS, wake lock, speech and vibration, so testers can report compatibility.
  - iOS caveats: vibration doesn't work in web apps on iOS (iPhones get voice and sound instead). Wake lock in installed home-screen apps only works on recent iOS versions, so the device check verifies each tester's phone.

## 5. Experience and levels

- **XP:** 100 XP per km, counted per 100 m, × your effort multiplier (capped at ×1.5 for XP), plus +50 XP for finishing any run of at least 1 km.
- **Level curve (starting value):** XP to the next level = `400 + 100 × level^1.4`. That's about 5 km for level 2, about 30 km per level around level 10, and about 70 km per level around level 20.
- **Each level grants 1 skill point** and some gold.

## 6. Effort multiplier (personal baseline)

The multiplier rewards beating _your own_ norm, so a 7:30/km beginner and a 4:00/km racer have equal odds.

- **Baseline** = the median pace and median distance of your last 10 validated runs (each at least 1 km, from the last 60 days). To make sandbagging (running slow on purpose to lower your baseline) pointless, the pace baseline uses your faster runs and drifts down only slowly.
- **Calibration:** your first 3 runs get a flat ×1.2, so onboarding feels good.
- **Bonuses (added together):**

| Bonus          | Rule                                                                | Max                          |
| -------------- | ------------------------------------------------------------------- | ---------------------------- |
| Pace           | +4 × (how much faster than baseline you ran), e.g. 5% faster = +0.2 | +0.4 (reached at 10% faster) |
| Distance       | +0.5 × (how much longer than baseline you ran)                      | +0.4                         |
| Consistency    | km splits vary by less than 5%                                      | +0.1                         |
| Negative split | second half faster than the first                                   | +0.1                         |
| Weekly streak  | +0.05 per consecutive active week                                   | +0.25                        |

- **Effort multiplier** = 1 + bonuses, **floored at 0.9 and capped at 2.0**. Easy and recovery runs are barely penalized.
- **Health guardrail:** the pace bonus maxes out at 10% faster than baseline, so there's no reason to go all-out every run. Streaks count **weeks, not days**, so rest days never break a streak.

## 7. Loot

- **Drops:** each full km gives **1 chest**. A final partial km of at least 500 m gives a small pouch (gold only).
- **Live reveal:** at each km the app announces the chest's _rarity_ ("Kilometer 3 — Epic chest!"). The _contents_ are opened in a reveal ceremony after the run.
- **Rarities (base odds):** Common 60% · Uncommon 25% · Rare 10% · Epic 4% · Legendary 1%. Your luck (effort multiplier × gear Luck) raises the odds of higher rarities: each tier's weight is multiplied by `luck^(tier/2)`, where Common is tier 0 and Legendary is tier 4. At a luck of ×2, that gives about 46 / 27 / 15 / 9 / 3%.
- **Bad-luck protection:** you're guaranteed a Rare or better chest if 10 chests in a row were below Rare.
- **Gear slots (beta):** Weapon, Armor, Boots, Trinket.
- **Stats:** Strength (boosts Warrior-style damage), Dexterity (Archer), Intellect (Mage), Luck (loot odds). Legendaries have one unique effect, e.g. "every 5th km is Rare or better."
- **Cosmetics:** pixel-art avatar outfits, colors, titles and profile frames. Visual only, no stats.
- **Gold:** comes from pouches, chests, levels and quests. It pays for respecs and later for cosmetics. No real-money purchases in the beta.
- **Fair and cheat-resistant rolls:** the server issues a random _seed_ when a run starts. The same game-logic code runs on the phone (for live announcements) and on the server (which has the final say when the run is submitted). The phone can roll chests offline, and the server re-checks every roll.

## 8. Skill tree (classes)

One character per player, with three branches. Where you spend your points decides your identity (and your title, e.g. "Warrior", "Spellblade", "Wanderer").

| Branch                       | Powered by                     | Style score per km                                               | Example skills                                                                   | Capstone (example)                                              |
| ---------------------------- | ------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Warrior** — Path of Speed  | Running fast and in surges     | This km's pace vs your baseline                                  | _Charge_: bonus damage on your fastest km. _Berserk_: surges can critically hit. | **Whirlwind**: every surge during a raid deals a burst hit      |
| **Archer** — Path of Rhythm  | Holding an even pace           | How close this km is to your run's average pace                  | _Steady Aim_: bonus for every km within ±5% of your average. _Volley_.           | **Perfect Shot**: a negative-split run deals a big critical hit |
| **Mage** — Path of Endurance | Distance and time on your feet | How far into the run you are, relative to your baseline distance | _Mana Well_: damage grows with each km. _Arcane Stamina_.                        | **Meteor**: every km beyond your baseline distance deals ×3     |

- **Tiers:** each branch has tier 1 → tier 2 (needs 5 points in that branch) → tier 3 (10 points) → capstone (15 points). Some small skills in every branch are utility (luck, XP, gold).
- **Generalists** reach every boss weakness a little, which is why solo play is easier for them. **Specialists** hit hard against one weakness through their capstone, which is why teams want a mix.
- **Respec:** costs gold, and the cost scales with your level.

## 9. Bosses and raids

- **Bestiary:** bosses are grouped into acts, and beating a boss unlocks the next. Each boss has a recommended level, fixed health, **weaknesses and resistances** to the three styles (×1.5 against a weakness, ×0.5 against a resistance), and sometimes a mechanic. Act 1 examples:
  - _Goblin King_: tutorial boss, neutral to every style.
  - _Swift Harpy_: weak to Speed. You have to catch it.
  - _Stone Golem_: weak to Rhythm, since steady, precise hits find the cracks. Resists Speed.
  - _Mire Troll_: huge health pool, weak to Endurance. Regenerates if you leave it alone for 2 days.
- **Raid window:** a team starts a raid, which stays open for **7 days** by default (set per boss). **Only kilometers run during the window deal damage**, and only while running. Your run screen shows the boss's health bar live.
- **Damage per km** = base (by level) × gear × Σ over the three branches of (your share of points in that branch × this km's style score × the boss's modifier for that style) × synergy × capstone effects.
- **Live synergy:** +10% damage for each teammate running at the same moment, up to +30% ("Mira is running with you! +10%").
- **Boss health is fixed per boss**, not scaled to team size. A solo player gets no synergy and doesn't cover every weakness, so solo takes more levels and more runs. The recommended level is shown for both solo and team play.
- **Joining mid-raid:** allowed at any time. The boss's health doesn't change, and the newcomer's runs count from the moment they join.
- **Victory:** every teammate with at least 1 run during the raid gets a boss chest (Rare or better guaranteed, with a chance at the boss's legendary) plus XP. **Failure** (the window closes): the boss escapes, and each player gets a consolation chest scaled by the share of damage dealt. You can retry.
- One active raid per team at a time.

## 10. Teams and social

- Teams of **up to 4**. Invite by **link** or **friend code**, and join or leave at any time. Damage you've already dealt stays with the raid.
- **Team feed:** runs, big loot drops, boss hits and level-ups.
- **Teammates see stats only** (distance, pace, damage, loot), **never your route**.
- Beta simplification: a player belongs to one team at a time.

## 11. Quests, streaks, achievements, leaderboards

- **Daily and weekly quests:** e.g. "Run 3 km", "Run a negative split", "3 runs this week", "15 km this week". Rewards are gold, XP and chests.
- **Weekly streaks:** count consecutive weeks where you hit your weekly run goal (default: 2 runs). They feed the streak bonus.
- **Achievements:** first 5K, first 10K, 100 km total, first Legendary, first boss kill, and so on.
- **Leaderboards (friends and team only):** weekly distance, raid damage, and **improvement vs baseline**, which keeps the boards fair across fitness levels.

## 12. In-run feedback

- **Voice** (the browser's built-in speech): kilometer announcements with pace, chest rarity, boss hits, level-ups and teammates joining a run.
- **Sounds:** short pixel-style effects for chests, hits and level-ups.
- **Vibration:** patterns for events. Android only on the web; iPhones get sound instead.
- Audio is unlocked by tapping "Start run", which browsers require before a page can play sound.

## 13. Anti-cheat (basic)

- The server re-checks every submitted run. It rejects stretches faster than about 25 km/h sustained for more than 30 s (cycling or driving), GPS jumps, timestamps that go backwards, and impossibly perfect data.
- Rejected stretches earn nothing. Heavily affected runs are **flagged** and get no rewards until reviewed in a simple admin view.
- The server is authoritative for all loot and damage (see §7).

## 14. Privacy

- GPS routes are stored privately and visible only to the runner. Teammates and leaderboards only ever see derived stats.
- Account deletion (which removes all routes) arrives in the same phase that starts storing routes. Data export comes before the beta widens.
- A short privacy notice explains what's collected. Beta testers are friends, but location data is still personal data (GDPR).

## 15. Look and feel

- **Pixel-art fantasy** built from licensed art packs (every license is recorded in the repo), a pixel font, and crisp scaling (`image-rendering: pixelated`).
- The **run screen** favors readability: high contrast, huge numbers, and pixel art only as accents.
- **Translation-ready:** every piece of text lives in locale files (English first).

## 16. Out of scope for the beta

Crafting, pets or companions, real-money purchases, treadmill or indoor runs, public leaderboards, open sign-up, and multiple teams per player.

## 17. Open questions (not blocking Phase 0)

1. **Final app name.** "Runhach" is a working title.
2. **Email provider** for login links. Resend is the suggestion; it needs an account and an API key before the Phase 0 deploy. In development, links are just logged.
3. **Exact balance numbers** (drop rates, XP curve, boss health, raid length). Tuned during test batches.
4. **Do imported runs (Phase 7) deal boss damage?** They were real runs, but not "live".
5. **Pixel-art pack choice** and its license terms.
6. **Weekly streak goal:** is 2 runs per week the right default?
