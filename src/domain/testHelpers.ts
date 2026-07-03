import type { DataPoint, Lap } from './models';

/** Build a straight-line synthetic lap with uniform speed. */
export function makeStraightLap(
  id: string,
  numPoints: number,
  speedKmh: number,
  leanDeg = 0,
): Lap {
  const speedMs = speedKmh / 3.6;
  const dtMs = 40; // 25 Hz
  const dxM = speedMs * (dtMs / 1000);

  const points: DataPoint[] = Array.from({ length: numPoints }, (_, i) => ({
    elapsedMs: i * dtMs,
    distanceM: i * dxM,
    distanceAlongLapM: i * dxM,
    gps: { lat: -28.261 + i * 0.00001, lng: 152.037 },
    velocityKmh: speedKmh,
    heading: 90,
    heightM: 100,
    longAccG: 0,
    vertAccG: 0,
    xGyro: 0, yGyro: 0, zGyro: 0,
    leanAngleDeg: leanDeg,
    satellites: 10,
  }));

  const lapTimeMs = (numPoints - 1) * dtMs;
  const trackLengthM = (numPoints - 1) * dxM;

  return {
    id,
    sessionId: 'test',
    lapNumber: 1,
    points,
    lapTimeMs,
    trackLengthM,
    metrics: {
      lapTimeMs,
      maxSpeedKmh: speedKmh,
      maxLeanAngleDeg: Math.abs(leanDeg),
      peakBrakingG: 0,
      peakAccelG: 0,
    },
    events: [],
  };
}

/** Build a lap from explicit (elapsedMs, distanceM, velocityKmh) tuples. */
export function makePointsLap(
  id: string,
  tuples: Array<{ ms: number; dist: number; kmh: number; lean?: number; acc?: number }>,
): Lap {
  const points: DataPoint[] = tuples.map(({ ms, dist, kmh, lean = 0, acc = 0 }) => ({
    elapsedMs: ms,
    distanceM: dist,
    distanceAlongLapM: dist,
    gps: { lat: -28.261, lng: 152.037 },
    velocityKmh: kmh,
    heading: 90,
    heightM: 100,
    longAccG: acc,
    vertAccG: 0,
    xGyro: 0, yGyro: 0, zGyro: 0,
    leanAngleDeg: lean,
    satellites: 10,
  }));
  const lapTimeMs = tuples[tuples.length - 1].ms - tuples[0].ms;
  const trackLengthM = tuples[tuples.length - 1].dist;
  return {
    id,
    sessionId: 'test',
    lapNumber: 1,
    points,
    lapTimeMs,
    trackLengthM,
    metrics: {
      lapTimeMs,
      maxSpeedKmh: Math.max(...tuples.map(t => t.kmh)),
      maxLeanAngleDeg: Math.max(...tuples.map(t => Math.abs(t.lean ?? 0))),
      peakBrakingG: Math.min(...tuples.map(t => t.acc ?? 0)),
      peakAccelG: Math.max(...tuples.map(t => t.acc ?? 0)),
    },
    events: [],
  };
}
