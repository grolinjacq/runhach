import type { LootItem } from "@runhach/game";
import { useSyncExternalStore } from "react";

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

const STORAGE_KEY = "runhach.progress.v1";

function emptyProgress(): Progress {
  return { totalXp: 0, items: [], runs: [] };
}

function parse(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const data = JSON.parse(raw) as Partial<Progress> | null;
    if (!data || typeof data !== "object") return emptyProgress();
    return {
      totalXp: typeof data.totalXp === "number" ? data.totalXp : 0,
      items: Array.isArray(data.items) ? data.items : [],
      runs: Array.isArray(data.runs) ? data.runs : [],
    };
  } catch {
    return emptyProgress();
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Stored per device in localStorage for the demo.
export function loadProgress(): Progress {
  return parse(readRaw());
}

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSnapshot: Progress = emptyProgress();
/** Set when a save failed; the in-memory snapshot then wins over storage. */
let memoryOnly = false;

function notify() {
  for (const listener of listeners) listener();
}

function getSnapshot(): Progress {
  if (memoryOnly) return cachedSnapshot;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parse(raw);
  }
  return cachedSnapshot;
}

/** Adds a finished run (its XP and loot) and returns the new progress. */
export function recordRun(run: RunSummary): Progress {
  const current = getSnapshot();
  const next: Progress = {
    totalXp: current.totalXp + run.xp,
    items: [...current.items, ...run.loot],
    runs: [run, ...current.runs],
  };
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Storage full or blocked: keep the progress in memory for this session.
    memoryOnly = true;
  }
  cachedRaw = raw;
  cachedSnapshot = next;
  notify();
  return next;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** React hook: current progress, re-rendering after recordRun(). */
export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
