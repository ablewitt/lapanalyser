import type { DataPoint, Lap } from './models';
import { haversineMeters } from '../utils/haversine';

export function addCumulativeDistance(points: DataPoint[]): void {
  if (points.length === 0) return;
  points[0].distanceM = 0;
  points[0].distanceAlongLapM = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineMeters(
      points[i - 1].gps.lat, points[i - 1].gps.lng,
      points[i].gps.lat, points[i].gps.lng,
    );
    points[i].distanceM = points[i - 1].distanceM + d;
  }
}

export interface DistanceGridSeries {
  lapId: string;
  lapColor?: string;
  distances: number[];
  velocityKmh: number[];
  longAccG: number[];
  leanAngleDeg: number[];
  heading: number[];
  heightM: number[];
  timeDeltaS: number[];
  lat: number[];
  lng: number[];
}

function interpolateGps(points: DataPoint[], targetDist: number): { lat: number; lng: number } {
  const n = points.length;
  if (targetDist <= points[0].distanceAlongLapM) return points[0].gps;
  if (targetDist >= points[n - 1].distanceAlongLapM) return points[n - 1].gps;
  let lo = 0, hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].distanceAlongLapM < targetDist) lo = mid; else hi = mid;
  }
  const span = points[hi].distanceAlongLapM - points[lo].distanceAlongLapM;
  const t = span < 1e-10 ? 0 : (targetDist - points[lo].distanceAlongLapM) / span;
  return {
    lat: points[lo].gps.lat + (points[hi].gps.lat - points[lo].gps.lat) * t,
    lng: points[lo].gps.lng + (points[hi].gps.lng - points[lo].gps.lng) * t,
  };
}

function interpolateGpsByTime(points: DataPoint[], targetLapMs: number): { lat: number; lng: number } {
  const lapStartMs = points[0].elapsedMs;
  const targetMs = targetLapMs + lapStartMs;
  const n = points.length;
  if (targetMs <= points[0].elapsedMs) return points[0].gps;
  if (targetMs >= points[n - 1].elapsedMs) return points[n - 1].gps;
  let lo = 0, hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].elapsedMs < targetMs) lo = mid; else hi = mid;
  }
  const span = points[hi].elapsedMs - points[lo].elapsedMs;
  const t = span < 1 ? 0 : (targetMs - points[lo].elapsedMs) / span;
  return {
    lat: points[lo].gps.lat + (points[hi].gps.lat - points[lo].gps.lat) * t,
    lng: points[lo].gps.lng + (points[hi].gps.lng - points[lo].gps.lng) * t,
  };
}

function interpolateChannel(
  points: DataPoint[],
  targetDist: number,
  channel: keyof Pick<DataPoint, 'velocityKmh' | 'longAccG' | 'leanAngleDeg' | 'heading' | 'heightM'>,
): number {
  const n = points.length;
  if (targetDist <= points[0].distanceAlongLapM) return points[0][channel];
  if (targetDist >= points[n - 1].distanceAlongLapM) return points[n - 1][channel];

  let lo = 0, hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].distanceAlongLapM < targetDist) lo = mid;
    else hi = mid;
  }
  const span = points[hi].distanceAlongLapM - points[lo].distanceAlongLapM;
  const t = span < 1e-10 ? 0 : (targetDist - points[lo].distanceAlongLapM) / span;
  return points[lo][channel] + (points[hi][channel] - points[lo][channel]) * t;
}

// Returns lap-relative ms elapsed when the vehicle reached targetDist
export function timeAtDistanceMs(points: DataPoint[], targetDist: number): number {
  const lapStartMs = points[0].elapsedMs;
  const n = points.length;
  if (targetDist <= points[0].distanceAlongLapM) return 0;
  if (targetDist >= points[n - 1].distanceAlongLapM) return points[n - 1].elapsedMs - lapStartMs;
  let lo = 0, hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].distanceAlongLapM < targetDist) lo = mid;
    else hi = mid;
  }
  const span = points[hi].distanceAlongLapM - points[lo].distanceAlongLapM;
  const t = span < 1e-10 ? 0 : (targetDist - points[lo].distanceAlongLapM) / span;
  return (points[lo].elapsedMs + (points[hi].elapsedMs - points[lo].elapsedMs) * t) - lapStartMs;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function buildDistanceGrid(
  laps: Lap[],
  resolutionM = 2,
): DistanceGridSeries[] {
  if (laps.length === 0) return [];
  const maxDist = median(laps.map(l => l.trackLengthM));
  const count = Math.ceil(maxDist / resolutionM) + 1;
  const distances = Array.from({ length: count }, (_, i) => i * resolutionM);

  // Reference times (lap 0) for computing per-lap delta
  const refTimes = distances.map(d => timeAtDistanceMs(laps[0].points, d));

  return laps.map(lap => {
    const lapTimes = distances.map(d => timeAtDistanceMs(lap.points, d));
    const gps = distances.map(d => interpolateGps(lap.points, d));
    return {
      lapId: lap.id,
      distances,
      velocityKmh: distances.map(d => interpolateChannel(lap.points, d, 'velocityKmh')),
      longAccG: distances.map(d => interpolateChannel(lap.points, d, 'longAccG')),
      leanAngleDeg: distances.map(d => interpolateChannel(lap.points, d, 'leanAngleDeg')),
      heading: distances.map(d => interpolateChannel(lap.points, d, 'heading')),
      heightM: distances.map(d => interpolateChannel(lap.points, d, 'heightM')),
      timeDeltaS: lapTimes.map((t, i) => (t - refTimes[i]) / 1000),
      lat: gps.map(g => g.lat),
      lng: gps.map(g => g.lng),
    };
  });
}

export interface TimeGridSeries {
  lapId: string;
  lapColor?: string;
  times: number[];
  velocityKmh: number[];
  longAccG: number[];
  leanAngleDeg: number[];
  distanceDeltaM: number[];
  lat: number[];
  lng: number[];
}

function distanceAtLapMs(points: DataPoint[], targetLapMs: number): number {
  const lapStartMs = points[0].elapsedMs;
  const targetMs = targetLapMs + lapStartMs;
  const n = points.length;
  if (targetMs <= points[0].elapsedMs) return points[0].distanceAlongLapM;
  if (targetMs >= points[n - 1].elapsedMs) return points[n - 1].distanceAlongLapM;
  let lo = 0, hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].elapsedMs < targetMs) lo = mid;
    else hi = mid;
  }
  const span = points[hi].elapsedMs - points[lo].elapsedMs;
  const t = span < 1 ? 0 : (targetMs - points[lo].elapsedMs) / span;
  return points[lo].distanceAlongLapM + (points[hi].distanceAlongLapM - points[lo].distanceAlongLapM) * t;
}

function interpolateChannelByTime(
  points: DataPoint[],
  targetLapMs: number,
  channel: keyof Pick<DataPoint, 'velocityKmh' | 'longAccG' | 'leanAngleDeg'>,
): number {
  const lapStartMs = points[0].elapsedMs;
  const targetMs = targetLapMs + lapStartMs;
  const n = points.length;
  if (targetMs <= points[0].elapsedMs) return points[0][channel];
  if (targetMs >= points[n - 1].elapsedMs) return points[n - 1][channel];

  let lo = 0, hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].elapsedMs < targetMs) lo = mid;
    else hi = mid;
  }
  const span = points[hi].elapsedMs - points[lo].elapsedMs;
  const t = span < 1 ? 0 : (targetMs - points[lo].elapsedMs) / span;
  return points[lo][channel] + (points[hi][channel] - points[lo][channel]) * t;
}

export function buildTimeGrid(
  laps: Lap[],
  intervalMs = 100,
): TimeGridSeries[] {
  if (laps.length === 0) return [];
  const maxTimeMs = median(laps.map(l => l.lapTimeMs));
  const count = Math.ceil(maxTimeMs / intervalMs) + 1;
  const times = Array.from({ length: count }, (_, i) => i * intervalMs);

  // Reference distances (lap 0) for delta
  const refDistances = times.map(t => distanceAtLapMs(laps[0].points, t));

  return laps.map(lap => {
    const lapDistances = times.map(t => distanceAtLapMs(lap.points, t));
    const gps = times.map(t => interpolateGpsByTime(lap.points, t));
    return {
      lapId: lap.id,
      times,
      velocityKmh: times.map(t => interpolateChannelByTime(lap.points, t, 'velocityKmh')),
      longAccG: times.map(t => interpolateChannelByTime(lap.points, t, 'longAccG')),
      leanAngleDeg: times.map(t => interpolateChannelByTime(lap.points, t, 'leanAngleDeg')),
      distanceDeltaM: lapDistances.map((d, i) => d - refDistances[i]),
      lat: gps.map(g => g.lat),
      lng: gps.map(g => g.lng),
    };
  });
}
