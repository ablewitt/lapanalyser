import type { Lap, LapEvent } from './models';
import { movingAverage, findLocalMaxima } from '../utils/signal';

const SMOOTH_WINDOW = 5;

const LEAN_CORNER_THRESHOLD = 8;
const MIN_CORNER_SPEED = 20;
const BRAKING_ACCEL_THRESHOLD = -0.25;
const BRAKING_ENTRY_SPEED = 60;
const BRAKING_MIN_SPEED_DROP = 15;
const ACCEL_THRESHOLD = 0.2;
const LEAN_UPRIGHT = 5;
const TOP_SPEED_FRACTION = 0.85;
const TOP_SPEED_DEBOUNCE_M = 200;

export function detectEvents(lap: Lap): LapEvent[] {
  const pts = lap.points;
  if (pts.length < 20) return [];

  const velocity = movingAverage(pts.map(p => p.velocityKmh), SMOOTH_WINDOW);
  const longAcc = movingAverage(pts.map(p => p.longAccG), SMOOTH_WINDOW);
  const lean = movingAverage(pts.map(p => Math.abs(p.leanAngleDeg)), SMOOTH_WINDOW);

  const events: LapEvent[] = [];

  // --- Apex detection ---
  const cornerSegments = findCornerSegments(lean);
  let cornerIndex = 0;
  for (const [start, end] of cornerSegments) {
    if (end - start < 3) continue;
    let minSpeed = Infinity, minIdx = start;
    for (let i = start; i <= end; i++) {
      if (velocity[i] < minSpeed) { minSpeed = velocity[i]; minIdx = i; }
    }
    if (minSpeed < MIN_CORNER_SPEED) { cornerIndex++; continue; }
    const p = pts[minIdx];
    events.push({
      type: 'APEX',
      distanceAlongLapM: p.distanceAlongLapM,
      elapsedMs: p.elapsedMs,
      velocityKmh: p.velocityKmh,
      longAccG: p.longAccG,
      gps: p.gps,
      label: `Apex ${cornerIndex + 1}`,
      detail: { type: 'APEX', cornerIndex, leanAngleDeg: lean[minIdx] },
    });
    cornerIndex++;
  }

  // --- Braking detection ---
  let i = 1;
  while (i < pts.length) {
    if (longAcc[i] < BRAKING_ACCEL_THRESHOLD && velocity[i] > BRAKING_ENTRY_SPEED) {
      const startIdx = i;
      while (i < pts.length && longAcc[i] < BRAKING_ACCEL_THRESHOLD) i++;
      const entrySpeed = velocity[startIdx];
      const exitSpeed = velocity[Math.min(i, pts.length - 1)];
      const speedDrop = entrySpeed - exitSpeed;
      if (speedDrop >= BRAKING_MIN_SPEED_DROP) {
        let peakDecelG = 0;
        for (let j = startIdx; j < i; j++) {
          if (longAcc[j] < peakDecelG) peakDecelG = longAcc[j];
        }
        const p = pts[startIdx];
        events.push({
          type: 'BRAKING',
          distanceAlongLapM: p.distanceAlongLapM,
          elapsedMs: p.elapsedMs,
          velocityKmh: p.velocityKmh,
          longAccG: p.longAccG,
          gps: p.gps,
          label: `Brake ${events.filter(e => e.type === 'BRAKING').length + 1}`,
          detail: { type: 'BRAKING', entrySpeedKmh: entrySpeed, exitSpeedKmh: exitSpeed, peakDecelG },
        });
      }
    } else {
      i++;
    }
  }

  // --- Acceleration detection (linked to each apex) ---
  for (const apexEvent of events.filter(e => e.type === 'APEX')) {
    const apexIdx = pts.findIndex(p => p.distanceAlongLapM >= apexEvent.distanceAlongLapM);
    if (apexIdx < 0) continue;
    for (let j = apexIdx; j < pts.length; j++) {
      if (lean[j] < LEAN_UPRIGHT && longAcc[j] > ACCEL_THRESHOLD) {
        const startIdx = j;
        while (j < pts.length && longAcc[j] > ACCEL_THRESHOLD) j++;
        let peakAccelG = 0;
        for (let k = startIdx; k < j; k++) {
          if (longAcc[k] > peakAccelG) peakAccelG = longAcc[k];
        }
        const p = pts[startIdx];
        const exitSpeed = velocity[Math.min(j, pts.length - 1)];
        events.push({
          type: 'ACCELERATION',
          distanceAlongLapM: p.distanceAlongLapM,
          elapsedMs: p.elapsedMs,
          velocityKmh: p.velocityKmh,
          longAccG: p.longAccG,
          gps: p.gps,
          label: `Accel ${events.filter(e => e.type === 'ACCELERATION').length + 1}`,
          detail: { type: 'ACCELERATION', exitSpeedKmh: exitSpeed, peakAccelG },
        });
        break;
      }
    }
  }

  // --- Top speed detection ---
  const lapMaxSpeed = Math.max(...velocity);
  const threshold = lapMaxSpeed * TOP_SPEED_FRACTION;
  const maxima = findLocalMaxima(velocity, 25);
  let lastTopSpeedDist = -TOP_SPEED_DEBOUNCE_M;
  let straightIndex = 0;
  for (const idx of maxima) {
    if (velocity[idx] < threshold) continue;
    const p = pts[idx];
    if (lean[idx] > LEAN_UPRIGHT) continue;
    if (p.distanceAlongLapM - lastTopSpeedDist < TOP_SPEED_DEBOUNCE_M) continue;
    events.push({
      type: 'TOP_SPEED',
      distanceAlongLapM: p.distanceAlongLapM,
      elapsedMs: p.elapsedMs,
      velocityKmh: p.velocityKmh,
      longAccG: p.longAccG,
      gps: p.gps,
      label: `Top Speed ${straightIndex + 1}`,
      detail: { type: 'TOP_SPEED', straightIndex },
    });
    lastTopSpeedDist = p.distanceAlongLapM;
    straightIndex++;
  }

  // Deduplicate: two apexes can resolve to the same acceleration zone start,
  // producing identical events at the same distance.
  const seen = new Set<string>();
  return events
    .sort((a, b) => a.distanceAlongLapM - b.distanceAlongLapM)
    .filter(ev => {
      const key = `${ev.type}-${ev.distanceAlongLapM}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function findCornerSegments(lean: number[]): [number, number][] {
  const segments: [number, number][] = [];
  let inCorner = false;
  let start = 0;
  for (let i = 0; i < lean.length; i++) {
    if (!inCorner && lean[i] > LEAN_CORNER_THRESHOLD) {
      inCorner = true;
      start = i;
    } else if (inCorner && lean[i] <= LEAN_CORNER_THRESHOLD) {
      segments.push([start, i - 1]);
      inCorner = false;
    }
  }
  if (inCorner) segments.push([start, lean.length - 1]);
  return segments;
}
