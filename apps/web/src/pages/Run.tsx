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
import { BrowserLocationSource } from "../lib/location/browser";
import { simulatedSource } from "../lib/location/replay";
import type { LocationError, LocationSource } from "../lib/location/types";
import { recordRun } from "../lib/progress";
import { ScreenKeeper } from "../lib/wake-lock";

type Mode = "gps" | "demo";
type Phase = "idle" | "running" | "done";

const DEMO_START = { lat: 49.4521, lon: 11.0767 };
const DEMO_PACE_SECONDS = 330; // 5:30 /km
const DEMO_SPEED = 30; // a km every ~11 s
const TOAST_MS = 4000;

interface Track {
  last: TrackPoint | null;
  firstTime: number | null;
  distance: number;
}

interface Summary {
  xp: number;
  level: number;
  leveledUp: boolean;
  distanceMeters: number;
  durationSeconds: number;
  loot: LootItem[];
}

const EMPTY_TRACK: Track = { last: null, firstTime: null, distance: 0 };

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
        <li key={item.id} className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: rarityColor(item.rarity), fontWeight: 700 }}>{item.name}</span>
          <span className="muted small">
            {t("run.kmTag", { km: item.foundAtKm })} · {t(`inventory.rarity.${item.rarity}`)}
          </span>
        </li>
      ))}
    </ul>
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
        setTrack((prev) => ({
          last: point,
          firstTime: prev.firstTime ?? point.time,
          distance: prev.distance + (prev.last ? haversineMeters(prev.last, point) : 0),
        }));
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
          {errorNotice}
          <div className="panel stack">
            <h2 style={{ margin: 0 }}>{t("run.lootThisRun")}</h2>
            <LootList loot={loot} />
          </div>
          <button type="button" className="btn danger block" onClick={stop}>
            {t("run.stop")}
          </button>
        </div>
        {toast && (
          <div
            className="toast panel"
            role="status"
            style={{ borderColor: rarityColor(toast.rarity) }}
          >
            <div className="small muted">
              {t("run.chestDropped", {
                km: toast.foundAtKm,
                rarity: t(`inventory.rarity.${toast.rarity}`),
              })}
            </div>
            <div style={{ color: rarityColor(toast.rarity), fontSize: 22, fontWeight: 800 }}>
              {toast.name}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "done" && summary) {
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
          <p className="notice success">{t("run.leveledUp", { level: summary.level })}</p>
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
      <h1>{t("run.title")}</h1>
      <p className="muted small">{t("run.intro")}</p>
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
