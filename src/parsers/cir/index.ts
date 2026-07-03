import type { GpsCoord } from '../../domain/models';

export function parseCirFile(text: string): GpsCoord[] {
  const m = text.match(/\[data\]([\s\S]*)/i);
  if (!m) return [];
  const pts: GpsCoord[] = [];
  for (const line of m[1].trim().split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p.length < 4) continue;
    const rawLat = parseFloat(p[2]);
    const rawLng = parseFloat(p[3]);
    if (isNaN(rawLat) || isNaN(rawLng)) continue;
    pts.push({ lat: rawLat / 60, lng: -(rawLng / 60) });
  }
  return pts;
}
