import { simulateRun, type SimulatedRunOptions, type TrackPoint } from "@runhach/game";
import type { LocationSource } from "./types";

/**
 * Replays recorded points in (optionally accelerated) real time. Point times are
 * re-based onto the wall clock so the rest of the app sees a "live" run.
 */
export class ReplayLocationSource implements LocationSource {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly points: readonly TrackPoint[],
    private readonly speed = 1,
  ) {}

  start(onPoint: (point: TrackPoint) => void): void {
    const first = this.points[0];
    if (!first) return;
    const startWall = Date.now();
    let i = 0;
    const emitNext = () => {
      const point = this.points[i];
      if (!point) return;
      onPoint({ ...point, time: startWall + (point.time - first.time) });
      i++;
      const next = this.points[i];
      if (next) this.timer = setTimeout(emitNext, (next.time - point.time) / this.speed);
    };
    emitNext();
  }

  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

/** A generated run (see `simulateRun` in @runhach/game), up to 4 hours long. */
export function simulatedSource(
  options: Omit<SimulatedRunOptions, "durationSeconds">,
  speed = 1,
): ReplayLocationSource {
  return new ReplayLocationSource(simulateRun({ ...options, durationSeconds: 4 * 3600 }), speed);
}
