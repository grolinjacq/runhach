import type { LocationError, LocationSource } from "./types";

const ERROR_CODES: Record<number, LocationError["code"]> = {
  1: "denied",
  2: "unavailable",
  3: "timeout",
};

/** Real device GPS via the Geolocation API. */
export class BrowserLocationSource implements LocationSource {
  private watchId: number | null = null;

  start(...[onPoint, onError]: Parameters<LocationSource["start"]>): void {
    if (!("geolocation" in navigator)) {
      onError({ code: "unsupported", message: "Geolocation is not available" });
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) =>
        onPoint({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          time: pos.timestamp,
          ...(pos.coords.altitude !== null ? { ele: pos.coords.altitude } : {}),
        }),
      (err) => onError({ code: ERROR_CODES[err.code] ?? "unavailable", message: err.message }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  }

  stop(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }
}
