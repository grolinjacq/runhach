import {
  BALANCE,
  formatPace,
  haversineMeters,
  levelFromTotalXp,
  newSeed,
  paceSecondsPerKm,
  rollChest,
  type LootItem,
  type Rarity,
  type TrackPoint,
} from "@runhach/game";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChestSprite, ItemSprite } from "../components/Sprites";
import { BrowserLocationSource } from "../lib/location/browser";
import { simulatedSource } from "../lib/location/replay";
import type { LocationError, LocationSource } from "../lib/location/types";
import { PaceBuddy } from "../components/PaceBuddy";
import { reportRunToParty } from "../lib/party";
import { recordRun } from "../lib/progress";
import { ScreenKeeper } from "../lib/wake-lock";

type Mode = "gps" | "demo";
type Phase = "idle" | "running" | "done";

const DEMO_START = { lat: 49.4521, lon: 11.0767 };
const DEMO_PACE_SECONDS = 330; // 5:30 /km
const DEMO_SPEED = 30; // a km every ~11 s
const TOAST_MS = 5200;
/** How long the chest shakes before it bursts open. */
const CHEST_SHAKE_MS = 900;

interface Track {
  last: TrackPoint | null;
  firstTime: number | null;
  distance: number;
  /** Recent (time, cumulative distance) samples for the current pace. */
  recent: Array<{ time: number; distance: number }>;
}

interface Summary {
  xp: number;
  level: number;
  leveledUp: boolean;
  distanceMeters: number;
  durationSeconds: number;
  loot: LootItem[];
}

const EMPTY_TRACK: Track = { last: null, firstTime: null, distance: 0, recent: [] };

/** Current pace uses roughly the last 30 seconds of the run. */
const PACE_WINDOW_MS = 30_000;

function currentPace(track: Track): number | null {
  const first = track.recent[0];
  const last = track.recent.at(-1);
  if (!first || !last) return null;
  const meters = last.distance - first.distance;
  const seconds = (last.time - first.time) / 1000;
  if (seconds < 8 || meters < 5) return null;
  return seconds / (meters / 1000);
}

/**
 * Demo run pace (s/km) over simulated time: cycles granny → jogger → runner →
 * sprinter → speedster so every pace buddy shows up.
 */
function demoPace(elapsedSeconds: number): number {
  const cycle = elapsedSeconds % 960;
  if (cycle < 180) return 630; // 10:30 /km
  if (cycle < 360) return 480; // 8:00
  if (cycle < 600) return 345; // 5:45
  if (cycle < 780) return 270; // 4:30
  return 200; // 3:20
}

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  angle: (360 / 24) * i + (i % 3) * 7,
  distance: 110 + ((i * 37) % 90),
  delay: (i % 5) * 40,
  coin: i % 3 === 0,
}));

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

const rarityColor = (rarity: Rarity) => `var(--rarity-${rarity})`;

/** 1 at the first km, creeping up for long runs, capped at 2. */
const luckForKm = (km: number) => Math.min(2, 1 + 0.05 * (km - 1));

const TIER: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

function playChestSound(ctx: AudioContext | null, rarity: Rarity) {
  if (!ctx) return;
  const tier = TIER[rarity];
  const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093];
  const notes = scale.slice(0, 2 + tier);
  if (tier >= 2)
    notes.push(
      ...scale
        .slice(0, 2 + tier)
        .reverse()
        .slice(1, 3),
      scale[2 + tier] ?? 2093,
    );
  const step = tier >= 2 ? 0.1 : 0.08;
  const now = ctx.currentTime;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const t0 = now + i * step;
    gain.gain.setValueAtTime(0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + step * 0.95);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + step);
  });
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  } catch {
    // speech is a nice-to-have
  }
}

const runScreen: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10,
  background: "#07050b",
  color: "#fff",
  overflowY: "auto",
  padding: "calc(env(safe-area-inset-top) + 24px) 16px calc(env(safe-area-inset-bottom) + 24px)",
};
const bigNumber: CSSProperties = {
  fontSize: "clamp(56px, 18vw, 96px)",
  fontWeight: 800,
  lineHeight: 1,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
};
const midNumber: CSSProperties = { ...bigNumber, fontSize: "clamp(32px, 10vw, 52px)" };

function LootList({ loot }: { loot: LootItem[] }) {
  const { t } = useTranslation();
  if (!loot.length) return <p className="muted small">{t("run.noLoot")}</p>;
  return (
    <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {loot.map((item) => (
        <li key={item.id} className="row loot-row" style={{ gap: 12, flexWrap: "nowrap" }}>
          <ItemSprite item={item} size={44} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ color: rarityColor(item.rarity), fontWeight: 700, display: "block" }}>
              {item.name}
            </span>
            <span className="muted small">
              {t("run.kmTag", { km: item.foundAtKm })} · {t(`inventory.rarity.${item.rarity}`)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "Next chest in 0.43 km · ≈ 2:21" with a filling bar and a waiting chest. */
function NextChest({ distance, elapsed }: { distance: number; elapsed: number }) {
  const { t } = useTranslation();
  const every = BALANCE.loot.chestEveryMeters;
  const into = distance % every;
  const remaining = every - into;
  const secondsPerMeter = distance > 30 ? elapsed / distance : null;
  const eta = secondsPerMeter ? formatDuration(remaining * secondsPerMeter) : "–:––";
  const close = remaining <= 150;
  return (
    <div className={`panel next-chest${close ? " close" : ""}`} data-testid="next-chest">
      <div className="row" style={{ flexWrap: "nowrap", gap: 14 }}>
        <ChestSprite rarity="common" open={false} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="next-chest-label">
            {close ? t("run.almostThere") : t("run.nextChest")}
          </div>
          <div className="next-chest-value">
            {t("run.nextChestIn", { distance: (remaining / 1000).toFixed(2) })}
          </div>
          <div className="muted small">{t("run.eta", { time: eta })}</div>
        </div>
      </div>
      <div className="chest-bar" aria-hidden>
        <span style={{ width: `${(into / every) * 100}%` }} />
      </div>
    </div>
  );
}

/** Full-screen chest reveal: the chest shakes, bursts open, and the item pops out. */
function ChestReveal({ item, onClose }: { item: LootItem; onClose: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), CHEST_SHAKE_MS);
    return () => clearTimeout(timer);
  }, [item.id]);
  const stats = Object.entries(item.stats)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `+${v} ${t(`inventory.stat.${k}`)}`)
    .join("  ");
  return (
    <div
      className={`chest-reveal rarity-${item.rarity}${open ? " open" : ""}`}
      role="status"
      onClick={onClose}
      style={{ "--rc": rarityColor(item.rarity) } as CSSProperties}
    >
      <div className="chest-reveal-card">
        <div className="chest-reveal-title">
          {t("run.chestDropped", {
            km: item.foundAtKm,
            rarity: t(`inventory.rarity.${item.rarity}`),
          })}
        </div>
        {open ? (
          <div className="chest-reveal-item">
            <ItemSprite item={item} size={128} />
            <div className="chest-reveal-name" style={{ color: rarityColor(item.rarity) }}>
              {item.name}
            </div>
            <div className="chest-reveal-rarity" style={{ color: rarityColor(item.rarity) }}>
              ★ {t(`inventory.rarity.${item.rarity}`)} {t(`inventory.slot.${item.slot}`)} ★
            </div>
            {stats && <div className="chest-reveal-stats">{stats}</div>}
          </div>
        ) : (
          <div className="chest-shake">
            <ChestSprite rarity={item.rarity} open={false} size={144} />
            <div className="muted small">{t("run.opening")}</div>
          </div>
        )}
        {open && (
          <>
            <div className="reveal-rays" aria-hidden />
            <div className="reveal-particles" aria-hidden>
              {PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className={p.coin ? "coin" : undefined}
                  style={
                    {
                      "--angle": `${p.angle}deg`,
                      "--distance": `${p.distance}px`,
                      animationDelay: `${p.delay}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <div className="chest-reveal-burst" aria-hidden>
              <ChestSprite rarity={item.rarity} open size={72} />
            </div>
          </>
        )}
        <div className="muted small">{t("run.tapToClose")}</div>
      </div>
    </div>
  );
}

export function RunPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("demo");
  const [phase, setPhase] = useState<Phase>("idle");
  const [track, setTrack] = useState<Track>(EMPTY_TRACK);
  const [loot, setLoot] = useState<LootItem[]>([]);
  const [toast, setToast] = useState<LootItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const source = useRef<LocationSource | null>(null);
  const keeper = useRef(new ScreenKeeper());
  const audio = useRef<AudioContext | null>(null);
  const seed = useRef("");
  const startedAt = useRef(0);
  const kmDone = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teardown = () => {
    source.current?.stop();
    source.current = null;
    void keeper.current.release();
    if (toastTimer.current) clearTimeout(toastTimer.current);
  };

  useEffect(() => teardown, []);

  // Chest drops: one per newly completed kilometer.
  useEffect(() => {
    if (phase !== "running") return;
    const km = Math.floor(track.distance / BALANCE.loot.chestEveryMeters);
    if (km <= kmDone.current) return;
    const dropped: LootItem[] = [];
    for (let k = kmDone.current + 1; k <= km; k++) {
      try {
        dropped.push(rollChest(seed.current, k, luckForKm(k)));
      } catch (e) {
        setError(t("run.chestError", { message: e instanceof Error ? e.message : String(e) }));
      }
    }
    kmDone.current = km;
    const best = dropped.at(-1);
    if (!best) return;
    setLoot((prev) => [...prev, ...dropped]);
    playChestSound(audio.current, best.rarity);
    navigator.vibrate?.(TIER[best.rarity] >= 2 ? [120, 60, 120, 60, 240] : [150]);
    speak(
      t("run.speech", {
        km: best.foundAtKm,
        rarity: t(`inventory.rarity.${best.rarity}`),
        name: best.name,
      }),
    );
    setToast(best);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, [track.distance, phase, t]);

  const start = () => {
    // Everything that needs a user gesture happens synchronously in this click.
    void keeper.current.acquire();
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        audio.current ??= new Ctx();
        void audio.current.resume();
      }
    } catch {
      audio.current = null;
    }
    if ("speechSynthesis" in window) {
      try {
        const warmup = new SpeechSynthesisUtterance(" ");
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
      } catch {
        // ignore
      }
    }

    seed.current = newSeed();
    startedAt.current = Date.now();
    kmDone.current = 0;
    setTrack(EMPTY_TRACK);
    setLoot([]);
    setToast(null);
    setError(null);
    setSummary(null);
    setPhase("running");

    const next: LocationSource =
      mode === "gps"
        ? new BrowserLocationSource()
        : simulatedSource(
            {
              start: DEMO_START,
              paceSecondsPerKm: DEMO_PACE_SECONDS,
              paceProfile: demoPace,
              jitterMeters: 3,
              paceWobble: 0.05,
              seed: seed.current,
            },
            DEMO_SPEED,
          );
    source.current = next;
    next.start(
      (point) => {
        if ((point.accuracy ?? 0) > BALANCE.antiCheat.maxAccuracyMeters) return;
        setTrack((prev) => {
          const distance = prev.distance + (prev.last ? haversineMeters(prev.last, point) : 0);
          const recent = [...prev.recent, { time: point.time, distance }];
          while (
            recent.length > 2 &&
            (recent[1] as { time: number }).time < point.time - PACE_WINDOW_MS
          ) {
            recent.shift();
          }
          return { last: point, firstTime: prev.firstTime ?? point.time, distance, recent };
        });
      },
      (err: LocationError) => setError(t("run.gpsError", { message: err.message || err.code })),
    );
  };

  const elapsed =
    track.last && track.firstTime !== null ? (track.last.time - track.firstTime) / 1000 : 0;

  const stop = () => {
    teardown();
    setToast(null);
    const distanceMeters = Math.round(track.distance);
    const durationSeconds = Math.round(elapsed);
    const xp =
      Math.round((track.distance / 1000) * BALANCE.xp.perKm) +
      (track.distance >= BALANCE.xp.runCompletionMinMeters ? BALANCE.xp.runCompletionBonus : 0);
    let level = 1;
    let leveledUp = false;
    try {
      const progress = recordRun({
        id: seed.current,
        startedAt: startedAt.current,
        distanceMeters,
        durationSeconds,
        xp,
        loot,
      });
      level = levelFromTotalXp(progress.totalXp).level;
      leveledUp = level > levelFromTotalXp(progress.totalXp - xp).level;
    } catch (e) {
      setError(t("run.saveError", { message: e instanceof Error ? e.message : String(e) }));
    }
    const best = loot.reduce<LootItem | null>(
      (top, item) => (!top || TIER[item.rarity] > TIER[top.rarity] ? item : top),
      null,
    );
    void reportRunToParty({
      distanceMeters,
      durationSeconds,
      xp,
      bestItem: best
        ? { name: best.name, rarity: best.rarity, slot: best.slot, base: best.base }
        : null,
    });
    setSummary({ xp, level, leveledUp, distanceMeters, durationSeconds, loot });
    setPhase("done");
  };

  const errorNotice = error && (
    <p className="notice error" role="alert">
      {error}
    </p>
  );

  if (phase === "running") {
    return (
      <div style={runScreen}>
        <div className="stack" style={{ maxWidth: 528, margin: "0 auto" }}>
          {mode === "demo" && (
            <p className="small" style={{ textAlign: "center", color: "var(--rarity-legendary)" }}>
              {t("run.demoBadge", { speed: DEMO_SPEED })}
            </p>
          )}
          <div>
            <div style={bigNumber} data-testid="run-distance">
              {(track.distance / 1000).toFixed(2)}
            </div>
            <div className="muted" style={{ textAlign: "center" }}>
              {t("run.km")}
            </div>
          </div>
          <div className="row" style={{ justifyContent: "space-around" }}>
            <div>
              <div style={midNumber}>{formatDuration(elapsed)}</div>
              <div className="muted small" style={{ textAlign: "center" }}>
                {t("run.time")}
              </div>
            </div>
            <div>
              <div style={midNumber}>{formatPace(paceSecondsPerKm(track.distance, elapsed))}</div>
              <div className="muted small" style={{ textAlign: "center" }}>
                {t("run.avgPace")}
              </div>
            </div>
          </div>
          {!track.last && (
            <p className="muted small" style={{ textAlign: "center" }}>
              {t("run.waitingForGps")}
            </p>
          )}
          <PaceBuddy paceSecondsPerKm={currentPace(track)} />
          <NextChest distance={track.distance} elapsed={elapsed} />
          {errorNotice}
          <div className="panel stack">
            <h2 style={{ margin: 0 }}>{t("run.lootThisRun")}</h2>
            <LootList loot={loot} />
          </div>
          <button type="button" className="btn danger block" onClick={stop}>
            {t("run.stop")}
          </button>
        </div>
        {toast && <ChestReveal key={toast.id} item={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  if (phase === "done" && summary) {
    const bestFind = summary.loot.reduce<LootItem | null>(
      (best, item) => (!best || TIER[item.rarity] > TIER[best.rarity] ? item : best),
      null,
    );
    return (
      <div className="stack">
        <h1>{t("run.summaryTitle")}</h1>
        {errorNotice}
        <div className="stats">
          <div className="stat">
            <div className="label">{t("run.distance")}</div>
            <div className="value">{(summary.distanceMeters / 1000).toFixed(2)} km</div>
          </div>
          <div className="stat">
            <div className="label">{t("run.time")}</div>
            <div className="value">{formatDuration(summary.durationSeconds)}</div>
          </div>
          <div className="stat">
            <div className="label">{t("run.xpEarned")}</div>
            <div className="value">+{summary.xp}</div>
          </div>
          <div className="stat">
            <div className="label">{t("run.level")}</div>
            <div className="value">{summary.level}</div>
          </div>
        </div>
        {summary.leveledUp && (
          <p className="notice success level-up">{t("run.leveledUp", { level: summary.level })}</p>
        )}
        {bestFind && (
          <div className={`panel best-find rarity-${bestFind.rarity}`}>
            <div className="next-chest-label">{t("run.bestFind")}</div>
            <div className="row" style={{ flexWrap: "nowrap", gap: 14 }}>
              <ItemSprite item={bestFind} size={88} />
              <div>
                <div style={{ color: rarityColor(bestFind.rarity), fontWeight: 700, fontSize: 20 }}>
                  {bestFind.name}
                </div>
                <div className="muted small">
                  {t(`inventory.rarity.${bestFind.rarity}`)} ·{" "}
                  {t(`inventory.slot.${bestFind.slot}`)}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="panel stack">
          <h2 style={{ margin: 0 }}>{t("run.lootThisRun")}</h2>
          <LootList loot={summary.loot} />
        </div>
        <Link to="/inventory" className="btn block">
          {t("run.toInventory")}
        </Link>
        <button type="button" className="btn secondary block" onClick={() => setPhase("idle")}>
          {t("run.runAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="center">
        <ChestSprite rarity="legendary" open={false} size={112} />
      </div>
      <h1 className="center">{t("run.title")}</h1>
      <p className="muted small center">{t("run.intro")}</p>
      <div className="panel stack" role="radiogroup" aria-label={t("run.modeLabel")}>
        <label className="row" style={{ gap: 8 }}>
          <input
            type="radio"
            name="run-mode"
            checked={mode === "gps"}
            onChange={() => setMode("gps")}
          />
          <span>
            <strong>{t("run.modeGps")}</strong>
            <br />
            <span className="muted small">{t("run.modeGpsHint")}</span>
          </span>
        </label>
        <label className="row" style={{ gap: 8 }}>
          <input
            type="radio"
            name="run-mode"
            checked={mode === "demo"}
            onChange={() => setMode("demo")}
          />
          <span>
            <strong>{t("run.modeDemo")}</strong>
            <br />
            <span className="muted small">{t("run.modeDemoHint", { speed: DEMO_SPEED })}</span>
          </span>
        </label>
      </div>
      {errorNotice}
      <button
        type="button"
        className="btn block"
        style={{ fontSize: 24, padding: "20px 16px" }}
        onClick={start}
      >
        {t("run.start")}
      </button>
    </div>
  );
}
