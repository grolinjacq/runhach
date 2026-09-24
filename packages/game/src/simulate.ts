import { destinationPoint, type TrackPoint } from "./geo";
import { createRng } from "./rng";

export interface SimulatedRunOptions {
  start: { lat: number; lon: number };
  /** Target pace in seconds per km. */
  paceSecondsPerKm: number;
  durationSeconds: number;
  /** Seconds between GPS fixes. */
  intervalSeconds?: number;
  /** Length of the circular loop the runner follows, in meters. */
  loopMeters?: number;
  /** Random GPS noise, in meters (0 = perfect). */
  jitterMeters?: number;
  /** Random pace wobble as a fraction, e.g. 0.05 = ±5%. */
  paceWobble?: number;
  startTime?: number;
  seed?: string;
}

/**
 * Generates a believable run around a circular loop. Used by the dev
 * "simulated run" screen and to build GPX fixtures for end-to-end tests,
 * so features can be tested without going for a run.
 */
export function simulateRun(options: SimulatedRunOptions): TrackPoint[] {
  const {
    start,
    paceSecondsPerKm,
    durationSeconds,
    intervalSeconds = 1,
    loopMeters = 1200,
    jitterMeters = 0,
    paceWobble = 0,
    startTime = Date.UTC(2026, 0, 1, 7, 0, 0),
    seed = "simulated-run",
  } = options;
  if (paceSecondsPerKm <= 0) throw new RangeError("paceSecondsPerKm must be positive");

  const rng = createRng(seed);
  const radius = loopMeters / (2 * Math.PI);
  // The loop's centre sits due east of the start, so the start lies on the loop.
  const centre = destinationPoint(start, 90, radius);
  const baseSpeed = 1000 / paceSecondsPerKm;

  const points: TrackPoint[] = [];
  let travelled = 0;
  // Real GPS error drifts slowly rather than jumping independently on every fix
  // (independent noise would inflate distance a lot), so the offset is a damped
  // random walk that stays within ±jitterMeters.
  let driftEast = 0;
  let driftNorth = 0;
  const damping = Math.exp(-intervalSeconds / 20);
  for (let t = 0; t <= durationSeconds; t += intervalSeconds) {
    if (t > 0) {
      const wobble = 1 + (rng.next() * 2 - 1) * paceWobble;
      travelled += baseSpeed * wobble * intervalSeconds;
    }
    // Angle measured from the centre: the start is due west of the centre (270°).
    const angle = 270 + (travelled / loopMeters) * 360;
    let position = destinationPoint(centre, angle, radius);
    if (jitterMeters > 0) {
      const step = jitterMeters * Math.sqrt(1 - damping * damping);
      driftEast = clamp(driftEast * damping + (rng.next() * 2 - 1) * step, jitterMeters);
      driftNorth = clamp(driftNorth * damping + (rng.next() * 2 - 1) * step, jitterMeters);
      const bearing = (Math.atan2(driftEast, driftNorth) * 180) / Math.PI;
      position = destinationPoint(position, bearing, Math.hypot(driftEast, driftNorth));
    }
    points.push({
      lat: position.lat,
      lon: position.lon,
      time: startTime + t * 1000,
      accuracy: Math.max(3, jitterMeters),
    });
  }
  return points;
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
