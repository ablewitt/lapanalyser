import type { Lap } from './models';
import { buildDistanceGrid } from './trackDistance';

export interface GroupStats {
  distances: number[];
  meanVelocity: number[];
  stdVelocity: number[];
  meanLongAccG: number[];
  stdLongAccG: number[];
  meanLapTimeMs: number;
  stdLapTimeMs: number;
  lapCount: number;
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[], avg: number): number {
  if (arr.length < 2) return 0;
  return Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / (arr.length - 1));
}

export function computeGroupStats(laps: Lap[], resolutionM = 2): GroupStats {
  if (laps.length === 0) {
    return {
      distances: [], meanVelocity: [], stdVelocity: [],
      meanLongAccG: [], stdLongAccG: [],
      meanLapTimeMs: 0, stdLapTimeMs: 0, lapCount: 0,
    };
  }

  const grids = buildDistanceGrid(laps, resolutionM);
  const count = grids[0].distances.length;

  const meanVelocity: number[] = new Array(count);
  const stdVelocity: number[] = new Array(count);
  const meanLongAccG: number[] = new Array(count);
  const stdLongAccG: number[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const vels = grids.map(g => g.velocityKmh[i]);
    const accs = grids.map(g => g.longAccG[i]);
    meanVelocity[i] = mean(vels);
    stdVelocity[i] = std(vels, meanVelocity[i]);
    meanLongAccG[i] = mean(accs);
    stdLongAccG[i] = std(accs, meanLongAccG[i]);
  }

  const lapTimes = laps.map(l => l.lapTimeMs);
  const meanLapTimeMs = mean(lapTimes);

  return {
    distances: grids[0].distances,
    meanVelocity,
    stdVelocity,
    meanLongAccG,
    stdLongAccG,
    meanLapTimeMs,
    stdLapTimeMs: std(lapTimes, meanLapTimeMs),
    lapCount: laps.length,
  };
}
