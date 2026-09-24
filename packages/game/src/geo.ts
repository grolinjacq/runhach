export interface TrackPoint {
  lat: number;
  lon: number;
  /** Unix epoch milliseconds. */
  time: number;
  /** Reported horizontal accuracy in meters, when known. */
  accuracy?: number;
  ele?: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in meters. */
export function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Point reached by travelling `distanceM` from `origin` on `bearingDeg` (0 = north). */
export function destinationPoint(
  origin: { lat: number; lon: number },
  bearingDeg: number,
  distanceM: number,
): { lat: number; lon: number } {
  const angular = distanceM / EARTH_RADIUS_M;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lon1 = toRad(origin.lon);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: toDeg(lat2), lon: ((toDeg(lon2) + 540) % 360) - 180 };
}

/** Total distance along a track in meters. */
export function trackDistanceMeters(points: readonly TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1] as TrackPoint, points[i] as TrackPoint);
  }
  return total;
}

/** Pace in seconds per km, or null when no distance has been covered. */
export function paceSecondsPerKm(distanceM: number, durationS: number): number | null {
  if (distanceM <= 0) return null;
  return durationS / (distanceM / 1000);
}

/** Formats seconds per km as "m:ss". */
export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm)) return "–:––";
  const rounded = Math.round(secondsPerKm);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
