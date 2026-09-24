import type { Rarity } from "@runhach/game";
import type { PartyResponse, PartyRunRequest } from "@runhach/shared";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import { useMe } from "./auth";

export interface RunReport {
  distanceMeters: number;
  durationSeconds: number;
  xp: number;
  bestItem: { name: string; rarity: Rarity; slot: string; base?: string | undefined } | null;
}

export const partyQueryKey = ["party"] as const;

/** The player's party (who invited them, who they invited) and its run feed; null when signed out. */
export function useParty() {
  const { data: me } = useMe();
  return useQuery({
    queryKey: partyQueryKey,
    queryFn: async () => {
      try {
        return await api<PartyResponse>("/party");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    enabled: !!me,
  });
}

const clampInt = (n: number, max: number) =>
  Math.min(max, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));

/**
 * Shares a finished run with the player's party feed. Fire-and-forget:
 * never throws (signed-out players and network errors are ignored).
 */
export async function reportRunToParty(report: RunReport): Promise<void> {
  try {
    const item = report.bestItem;
    const body: PartyRunRequest = {
      distanceMeters: clampInt(report.distanceMeters, 200_000),
      durationSeconds: clampInt(report.durationSeconds, 86_400),
      xp: clampInt(report.xp, 100_000),
      bestItem: item
        ? {
            name: item.name.slice(0, 80),
            rarity: item.rarity,
            slot: item.slot.slice(0, 20),
            ...(item.base !== undefined ? { base: item.base.slice(0, 20) } : {}),
          }
        : null,
    };
    await api<{ id: string }>("/party/runs", { method: "POST", json: body });
  } catch {
    // Signed out, offline or rejected: the party feed is a nice-to-have.
  }
}
