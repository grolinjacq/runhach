import type { LootItem } from "@runhach/game";

/** One finished run, as shown in history and saved on this device. */
export interface RunSummary {
  id: string;
  startedAt: number;
  distanceMeters: number;
  durationSeconds: number;
  xp: number;
  loot: LootItem[];
}

export interface Progress {
  totalXp: number;
  items: LootItem[];
  runs: RunSummary[];
}

// TODO(agent A): implement. Stored per device in localStorage for the demo.
export function loadProgress(): Progress {
  return { totalXp: 0, items: [], runs: [] };
}

/** Adds a finished run (its XP and loot) and returns the new progress. */
export function recordRun(run: RunSummary): Progress {
  void run;
  return loadProgress();
}

/** React hook: current progress, re-rendering after recordRun(). */
export function useProgress(): Progress {
  return loadProgress();
}
