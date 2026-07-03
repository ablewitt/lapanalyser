import type { DataPoint, Gate, GpsCoord, Lap, LapMetrics } from './models';
import { segmentIntersect, lerp } from '../utils/geometry';

const DEG_TO_RAD = Math.PI / 180;

function toLocal(gps: GpsCoord, origin: GpsCoord): [number, number] {
  const R = 6_371_000;
  const x = (gps.lng - origin.lng) * Math.cos(origin.lat * DEG_TO_RAD) * R * DEG_TO_RAD;
  const y = (gps.lat - origin.lat) * R * DEG_TO_RAD;
  return [x, y];
}

interface CrossingEvent {
  pointIndex: number;
  t: number;
  elapsedMs: number;
  distanceM: number;
}

export function detectLapCrossings(
  points: DataPoint[],
  gate: Gate,
  origin: GpsCoord,
): CrossingEvent[] {
  const [gx1, gy1] = toLocal(gate.p1, origin);
  const [gx2, gy2] = toLocal(gate.p2, origin);

  const MIN_SPEED_KMH = 30;
  const MIN_INTER_LAP_MS = 30_000;
  const crossings: CrossingEvent[] = [];
  let lastCrossingMs = -MIN_INTER_LAP_MS;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.velocityKmh < MIN_SPEED_KMH) continue;
    if (p.elapsedMs - lastCrossingMs < MIN_INTER_LAP_MS) continue;

    const [ax, ay] = toLocal(points[i - 1].gps, origin);
    const [bx, by] = toLocal(p.gps, origin);

    const t = segmentIntersect(ax, ay, bx, by, gx1, gy1, gx2, gy2);
    if (t !== null) {
      const crossingMs = lerp(points[i - 1].elapsedMs, p.elapsedMs, t);
      const crossingDist = lerp(points[i - 1].distanceM, p.distanceM, t);
      crossings.push({ pointIndex: i, t, elapsedMs: crossingMs, distanceM: crossingDist });
      lastCrossingMs = crossingMs;
    }
  }
  return crossings;
}

function computeMetrics(points: DataPoint[], lapTimeMs: number): LapMetrics {
  let maxSpeedKmh = 0;
  let maxLeanAngleDeg = 0;
  let peakBrakingG = 0;
  let peakAccelG = 0;
  for (const p of points) {
    if (p.velocityKmh > maxSpeedKmh) maxSpeedKmh = p.velocityKmh;
    if (Math.abs(p.leanAngleDeg) > maxLeanAngleDeg) maxLeanAngleDeg = Math.abs(p.leanAngleDeg);
    if (p.longAccG < peakBrakingG) peakBrakingG = p.longAccG;
    if (p.longAccG > peakAccelG) peakAccelG = p.longAccG;
  }
  return { lapTimeMs, maxSpeedKmh, maxLeanAngleDeg, peakBrakingG, peakAccelG };
}

export function assembleLaps(
  sessionId: string,
  points: DataPoint[],
  crossings: CrossingEvent[],
): Lap[] {
  if (crossings.length < 2) return [];

  const laps: Lap[] = [];

  for (let i = 0; i < crossings.length - 1; i++) {
    const start = crossings[i];
    const end = crossings[i + 1];

    const lapPoints = points
      .filter(p => p.elapsedMs >= start.elapsedMs && p.elapsedMs <= end.elapsedMs)
      .map(p => ({
        ...p,
        distanceAlongLapM: p.distanceM - start.distanceM,
      }));

    if (lapPoints.length < 10) continue;

    const lapTimeMs = end.elapsedMs - start.elapsedMs;
    const trackLengthM = end.distanceM - start.distanceM;
    const lapNumber = i + 1;

    laps.push({
      id: `${sessionId}-${lapNumber}`,
      sessionId,
      lapNumber,
      points: lapPoints,
      lapTimeMs,
      trackLengthM,
      metrics: computeMetrics(lapPoints, lapTimeMs),
      events: [],
    });
  }

  return laps;
}
