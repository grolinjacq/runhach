import type { TrackPoint } from "@runhach/game";

/** Draws a track as a line, scaled to fit. No map tiles (routes stay private). */
export function TrackPlot({ points }: { points: readonly TrackPoint[] }) {
  if (points.length < 2) return <svg className="track-plot" viewBox="0 0 100 100" aria-hidden />;
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  // Longitude degrees shrink with latitude; correct so loops look round.
  const xScale = Math.cos((midLat * Math.PI) / 180);
  const xs = lons.map((l) => l * xScale);
  const minX = Math.min(...xs);
  const minY = Math.min(...lats);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...lats) - minY, 1e-9);
  const coords = points
    .map((p, i) => {
      const x = 8 + (((xs[i] as number) - minX) / span) * 84;
      const y = 92 - ((p.lat - minY) / span) * 84;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const last = coords.split(" ").at(-1)!.split(",");
  return (
    <svg className="track-plot" viewBox="0 0 100 100" role="img" aria-label="Track">
      <polyline
        points={coords}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x={Number(last[0]) - 2}
        y={Number(last[1]) - 2}
        width="4"
        height="4"
        fill="var(--green)"
      />
    </svg>
  );
}
