import { describe, expect, it } from "vitest";
import {
  destinationPoint,
  formatPace,
  haversineMeters,
  paceSecondsPerKm,
  trackDistanceMeters,
} from "./geo";
import { parseGpx, toGpx } from "./gpx";
import { simulateRun } from "./simulate";

const NUREMBERG = { lat: 49.4521, lon: 11.0767 };

describe("geo", () => {
  it("measures a known distance (1° of latitude ≈ 111.2 km)", () => {
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) / 1000).toBeCloseTo(111.2, 1);
  });

  it("destinationPoint round-trips with haversine", () => {
    const p = destinationPoint(NUREMBERG, 45, 1000);
    expect(haversineMeters(NUREMBERG, p)).toBeCloseTo(1000, 3);
  });

  it("computes and formats pace", () => {
    expect(paceSecondsPerKm(5000, 1500)).toBe(300);
    expect(paceSecondsPerKm(0, 100)).toBeNull();
    expect(formatPace(300)).toBe("5:00");
    expect(formatPace(359.6)).toBe("6:00");
    expect(formatPace(null)).toBe("–:––");
  });
});

describe("simulateRun", () => {
  it("produces the requested distance at the requested pace", () => {
    const track = simulateRun({ start: NUREMBERG, paceSecondsPerKm: 300, durationSeconds: 600 });
    expect(track).toHaveLength(601);
    // 10 minutes at 5:00/km = 2 km. Chords on a 1.2 km loop are ~0.00001% short.
    expect(trackDistanceMeters(track)).toBeCloseTo(2000, 0);
    expect(haversineMeters(NUREMBERG, track[0]!)).toBeLessThan(0.01);
  });

  it("keeps GPS noise from inflating distance much (1 s fixes, 3 m noise)", () => {
    const base = { start: NUREMBERG, paceSecondsPerKm: 330, durationSeconds: 1800 };
    const clean = trackDistanceMeters(simulateRun(base));
    const noisy = trackDistanceMeters(simulateRun({ ...base, jitterMeters: 3, seed: "noise" }));
    expect(Math.abs(noisy - clean) / clean).toBeLessThan(0.03);
  });

  it("is deterministic with noise for a given seed", () => {
    const opts = {
      start: NUREMBERG,
      paceSecondsPerKm: 360,
      durationSeconds: 60,
      jitterMeters: 4,
      paceWobble: 0.1,
      seed: "x",
    };
    expect(simulateRun(opts)).toEqual(simulateRun(opts));
  });
});

describe("gpx", () => {
  it("round-trips a simulated track", () => {
    const track = simulateRun({ start: NUREMBERG, paceSecondsPerKm: 330, durationSeconds: 30 });
    const parsed = parseGpx(toGpx(track));
    expect(parsed).toHaveLength(track.length);
    expect(parsed[5]!.time).toBe(track[5]!.time);
    expect(parsed[5]!.lat).toBeCloseTo(track[5]!.lat, 6);
  });

  it("parses self-closing points, elevation and missing times", () => {
    const xml = `<gpx><trk><trkseg>
      <trkpt lat="1.5" lon="2.5"><ele>310.2</ele><time>2026-01-01T07:00:00Z</time></trkpt>
      <trkpt lon='2.6' lat='1.6'/>
      <trkpt lat="bad" lon="2.7"></trkpt>
    </trkseg></trk></gpx>`;
    const points = parseGpx(xml);
    expect(points).toEqual([
      { lat: 1.5, lon: 2.5, ele: 310.2, time: Date.parse("2026-01-01T07:00:00Z") },
      { lat: 1.6, lon: 2.6, time: Date.parse("2026-01-01T07:00:01Z") },
    ]);
  });
});
