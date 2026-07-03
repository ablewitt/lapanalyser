import type { GpsCoord } from './models';
import { haversineMeters } from '../utils/haversine';

export interface CircuitEntry {
  name: string;
  country: string;
  path: string;
  centLat: number;
  centLng: number;
  minLat: number; maxLat: number;
  minLng: number; maxLng: number;
  sample: [number, number][];
}

function centroid(pts: GpsCoord[]): GpsCoord {
  return {
    lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
    lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
  };
}

// Mean of (nearest circuit sample point) for a set of session sample points.
// Lower = better match.
function scoreLayout(sessionSample: GpsCoord[], cirSample: [number, number][]): number {
  if (cirSample.length === 0) return Infinity;
  let total = 0;
  for (const sp of sessionSample) {
    let best = Infinity;
    for (const [lat, lng] of cirSample) {
      const d = haversineMeters(sp.lat, sp.lng, lat, lng);
      if (d < best) best = d;
    }
    total += best;
  }
  return total / sessionSample.length;
}

export function detectCircuit(
  sessionPoints: GpsCoord[],
  index: CircuitEntry[],
): CircuitEntry | null {
  if (sessionPoints.length === 0 || index.length === 0) return null;

  const c = centroid(sessionPoints);

  // Phase 1: keep only circuits within 5 km of the session centroid
  const candidates = index.filter(e =>
    haversineMeters(c.lat, c.lng, e.centLat, e.centLng) < 5000
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Phase 2: score each candidate with ~50 sampled session points
  const step = Math.max(1, Math.floor(sessionPoints.length / 50));
  const sessionSample = sessionPoints.filter((_, i) => i % step === 0).slice(0, 50);

  let bestEntry = candidates[0];
  let bestScore = Infinity;
  for (const entry of candidates) {
    const score = scoreLayout(sessionSample, entry.sample);
    if (score < bestScore) { bestScore = score; bestEntry = entry; }
  }
  return bestEntry;
}
