import type { TrackPoint } from "./geo";

const TRKPT = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;
const attr = (attrs: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`).exec(attrs)?.[1];
const child = (body: string, tag: string) =>
  new RegExp(`<${tag}\\b[^>]*>\\s*([^<]+?)\\s*</${tag}>`).exec(body)?.[1];

/**
 * Minimal GPX track parser for test fixtures and replay (no DOM needed).
 * Points without a timestamp get one second spacing after the previous point.
 */
export function parseGpx(xml: string): TrackPoint[] {
  const points: TrackPoint[] = [];
  for (const match of xml.matchAll(TRKPT)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const lat = Number(attr(attrs, "lat"));
    const lon = Number(attr(attrs, "lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const timeText = child(body, "time");
    const parsedTime = timeText ? Date.parse(timeText) : NaN;
    const previous = points.at(-1);
    const time = Number.isFinite(parsedTime) ? parsedTime : previous ? previous.time + 1000 : 0;

    const eleText = child(body, "ele");
    const point: TrackPoint = { lat, lon, time };
    if (eleText !== undefined && Number.isFinite(Number(eleText))) point.ele = Number(eleText);
    points.push(point);
  }
  return points;
}

/** Serialises a track as GPX 1.1, e.g. for generating replay fixtures. */
export function toGpx(points: readonly TrackPoint[], name = "Runhach track"): string {
  const pts = points
    .map(
      (p) =>
        `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">` +
        (p.ele !== undefined ? `<ele>${p.ele.toFixed(1)}</ele>` : "") +
        `<time>${new Date(p.time).toISOString()}</time></trkpt>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="runhach" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name.replace(/[<&>]/g, "")}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`;
}
