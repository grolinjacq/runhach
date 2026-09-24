import {
  BALANCE,
  formatPace,
  haversineMeters,
  paceSecondsPerKm,
  parseGpx,
  type TrackPoint,
} from "@runhach/game";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrackPlot } from "../components/TrackPlot";
import { BrowserLocationSource } from "../lib/location/browser";
import { ReplayLocationSource, simulatedSource } from "../lib/location/replay";
import type { LocationError, LocationSource } from "../lib/location/types";
import { ScreenKeeper } from "../lib/wake-lock";

type SourceKind = "device" | "sim" | "gpx";

const DEFAULT_START = { lat: 49.4521, lon: 11.0767 };

function parsePace(text: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

/** Developer tool: exercises the GPS pipeline with real, simulated or replayed fixes. */
export function GpsLabPage() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<SourceKind>("sim");
  const [pace, setPace] = useState("5:30");
  const [speed, setSpeed] = useState(10);
  const [gpxPoints, setGpxPoints] = useState<TrackPoint[] | null>(null);
  const [track, setTrack] = useState<{ points: TrackPoint[]; distance: number }>({
    points: [],
    distance: 0,
  });
  const { points, distance } = track;
  const [running, setRunning] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);

  const source = useRef<LocationSource | null>(null);
  const keeper = useRef(new ScreenKeeper());

  const stop = () => {
    source.current?.stop();
    source.current = null;
    void keeper.current.release();
    setScreenOn(false);
    setRunning(false);
  };

  useEffect(() => stop, []);

  const start = async () => {
    let next: LocationSource;
    if (kind === "device") {
      next = new BrowserLocationSource();
    } else if (kind === "sim") {
      next = simulatedSource(
        {
          start: DEFAULT_START,
          paceSecondsPerKm: parsePace(pace) ?? 330,
          jitterMeters: 3,
          paceWobble: 0.05,
          seed: String(Date.now()),
        },
        speed,
      );
    } else {
      if (!gpxPoints?.length) return;
      next = new ReplayLocationSource(gpxPoints, speed);
    }

    setTrack({ points: [], distance: 0 });
    setError(null);
    setRunning(true);
    setScreenOn(await keeper.current.acquire());
    source.current = next;
    next.start(
      (point) => {
        if ((point.accuracy ?? 0) > BALANCE.antiCheat.maxAccuracyMeters) return;
        setTrack((prev) => {
          const last = prev.points.at(-1);
          return {
            points: [...prev.points, point],
            distance: prev.distance + (last ? haversineMeters(last, point) : 0),
          };
        });
      },
      (err) => setError(err),
    );
  };

  const first = points[0];
  const last = points.at(-1);
  const elapsed = first && last ? (last.time - first.time) / 1000 : 0;

  return (
    <div className="stack">
      <h1>{t("gpsLab.title")}</h1>
      <p className="muted small">{t("gpsLab.intro")}</p>

      <div className="panel stack">
        <div className="field">
          <label htmlFor="lab-source">{t("gpsLab.source")}</label>
          <select
            id="lab-source"
            value={kind}
            disabled={running}
            onChange={(e) => setKind(e.target.value as SourceKind)}
          >
            <option value="device">{t("gpsLab.sourceDevice")}</option>
            <option value="sim">{t("gpsLab.sourceSim")}</option>
            <option value="gpx">{t("gpsLab.sourceGpx")}</option>
          </select>
        </div>
        {kind === "sim" && (
          <div className="field">
            <label htmlFor="lab-pace">{t("gpsLab.pace")}</label>
            <input
              id="lab-pace"
              inputMode="numeric"
              value={pace}
              disabled={running}
              onChange={(e) => setPace(e.target.value)}
            />
          </div>
        )}
        {kind === "gpx" && (
          <div className="field">
            <label htmlFor="lab-gpx">{t("gpsLab.file")}</label>
            <input
              id="lab-gpx"
              type="file"
              accept=".gpx,application/gpx+xml"
              disabled={running}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void file.text().then((xml) => setGpxPoints(parseGpx(xml)));
              }}
            />
          </div>
        )}
        {kind !== "device" && (
          <div className="field">
            <label htmlFor="lab-speed">{t("gpsLab.speed")}</label>
            <select
              id="lab-speed"
              value={speed}
              disabled={running}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {[1, 10, 60].map((s) => (
                <option key={s} value={s}>
                  ×{s}
                </option>
              ))}
            </select>
          </div>
        )}
        {running ? (
          <button type="button" className="btn danger" onClick={stop}>
            {t("gpsLab.stop")}
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => void start()}
            disabled={kind === "gpx" && !gpxPoints?.length}
          >
            {t("gpsLab.start")}
          </button>
        )}
      </div>

      {error && (
        <p className="notice error" role="alert">
          {t("gpsLab.error", { message: error.message || error.code })}
        </p>
      )}

      <div className="stats">
        <div className="stat">
          <div className="label">{t("gpsLab.distance")}</div>
          <div className="value" data-testid="lab-distance">
            {(distance / 1000).toFixed(2)} km
          </div>
        </div>
        <div className="stat">
          <div className="label">{t("gpsLab.elapsed")}</div>
          <div className="value">{formatDuration(elapsed)}</div>
        </div>
        <div className="stat">
          <div className="label">{t("gpsLab.currentPace")}</div>
          <div className="value">{formatPace(paceSecondsPerKm(distance, elapsed))}</div>
        </div>
        <div className="stat">
          <div className="label">{t("gpsLab.fixes")}</div>
          <div className="value" data-testid="lab-fixes">
            {points.length}
          </div>
        </div>
        <div className="stat">
          <div className="label">{t("gpsLab.accuracy")}</div>
          <div className="value">
            {last?.accuracy !== undefined ? `${Math.round(last.accuracy)} m` : "–"}
          </div>
        </div>
        <div className="stat">
          <div className="label">{t("gpsLab.screenOn")}</div>
          <div className="value">{screenOn ? "✓" : "–"}</div>
        </div>
      </div>

      <TrackPlot points={points} />
    </div>
  );
}
