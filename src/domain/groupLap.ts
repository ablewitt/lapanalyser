import type { DataPoint, Lap } from './models';
import { buildDistanceGrid, timeAtDistanceMs } from './trackDistance';
import { detectEvents } from './eventDetection';

function averageArrays(arrays: number[][]): number[] {
  if (arrays.length === 0) return [];
  const len = arrays[0].length;
  return Array.from({ length: len }, (_, i) =>
    arrays.reduce((s, a) => s + (a[i] ?? 0), 0) / arrays.length,
  );
}

export function buildMeanLap(
  id: 'group-mean-a' | 'group-mean-b',
  members: Lap[],
): Lap | null {
  if (members.length === 0) return null;

  const grids = buildDistanceGrid(members, 2);
  const distances = grids[0].distances;

  // grids[j].timeDeltaS[i] = (Tj_i - T0_i) / 1000  (all relative to members[0])
  // mean elapsed at distance i = T0_i + mean(Tj_i - T0_i) = avg of all Tj_i
  const refTimes = distances.map(d => timeAtDistanceMs(members[0].points, d));
  const meanDeltaS = averageArrays(grids.map(g => g.timeDeltaS));
  const meanElapsedMs = refTimes.map((t, i) => t + meanDeltaS[i] * 1000);

  const meanLat = averageArrays(grids.map(g => g.lat));
  const meanLng = averageArrays(grids.map(g => g.lng));
  const meanVel = averageArrays(grids.map(g => g.velocityKmh));
  const meanLongAcc = averageArrays(grids.map(g => g.longAccG));
  const meanLean = averageArrays(grids.map(g => g.leanAngleDeg));
  const meanHeading = averageArrays(grids.map(g => g.heading));
  const meanHeight = averageArrays(grids.map(g => g.heightM));

  const points: DataPoint[] = distances.map((dist, i) => ({
    elapsedMs: meanElapsedMs[i],
    distanceM: dist,
    distanceAlongLapM: dist,
    gps: { lat: meanLat[i], lng: meanLng[i] },
    velocityKmh: meanVel[i],
    heading: meanHeading[i],
    heightM: meanHeight[i],
    longAccG: meanLongAcc[i],
    vertAccG: 0,
    xGyro: 0,
    yGyro: 0,
    zGyro: 0,
    leanAngleDeg: meanLean[i],
    satellites: 0,
  }));

  const avg = (fn: (l: Lap) => number) =>
    members.reduce((s, l) => s + fn(l), 0) / members.length;

  const lapTimeMs = avg(l => l.lapTimeMs);

  const meanLap: Lap = {
    id,
    sessionId: 'group-means',
    lapNumber: 0,
    points,
    lapTimeMs,
    trackLengthM: avg(l => l.trackLengthM),
    metrics: {
      lapTimeMs,
      maxSpeedKmh: avg(l => l.metrics.maxSpeedKmh),
      maxLeanAngleDeg: avg(l => l.metrics.maxLeanAngleDeg),
      peakBrakingG: avg(l => l.metrics.peakBrakingG),
      peakAccelG: avg(l => l.metrics.peakAccelG),
    },
    events: [],
  };

  meanLap.events = detectEvents(meanLap);
  return meanLap;
}
