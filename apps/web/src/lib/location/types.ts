import type { TrackPoint } from "@runhach/game";

export type LocationErrorCode = "denied" | "unavailable" | "timeout" | "unsupported";

export interface LocationError {
  code: LocationErrorCode;
  message: string;
}

/**
 * Anything that produces GPS fixes. The run engine only talks to this
 * interface, so real GPS, simulated runs and GPX replays are interchangeable.
 */
export interface LocationSource {
  start(onPoint: (point: TrackPoint) => void, onError: (error: LocationError) => void): void;
  stop(): void;
}
