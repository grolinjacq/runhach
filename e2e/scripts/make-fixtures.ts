// Regenerates the GPX fixtures used by tests and the GPS lab.
// Run from e2e/: `npx tsx scripts/make-fixtures.ts`
import { writeFileSync } from "node:fs";
import { simulateRun, toGpx, trackDistanceMeters } from "@runhach/game";

const track = simulateRun({
  start: { lat: 49.4521, lon: 11.0767 },
  paceSecondsPerKm: 330,
  durationSeconds: 330,
  intervalSeconds: 5,
  loopMeters: 800,
  jitterMeters: 2,
  seed: "e2e-park-loop",
});
writeFileSync("fixtures/park-loop-1km.gpx", toGpx(track, "Park loop, 1 km at 5:30/km"));
console.log(
  `park-loop-1km.gpx: ${track.length} points, ${trackDistanceMeters(track).toFixed(1)} m`,
);
