import type { Lap, SpeedTrap, SpeedTrapResult } from './models';
import { timeAtDistanceMs, interpolateChannel } from './trackDistance';

export function computeSpeedTrapResults(
  traps: SpeedTrap[],
  lap: Lap,
  referenceLap?: Lap,
): SpeedTrapResult[] {
  if (traps.length === 0) return [];
  const sorted = [...traps].sort((a, b) => a.distanceAlongLapM - b.distanceAlongLapM);
  return sorted.map((trap, i) => {
    const d = trap.distanceAlongLapM;
    const speedKmh = interpolateChannel(lap.points, d, 'velocityKmh');
    const leanAngleDeg = interpolateChannel(lap.points, d, 'leanAngleDeg');
    const longAccG = interpolateChannel(lap.points, d, 'longAccG');
    const elapsedMs = timeAtDistanceMs(lap.points, d);

    let timeDeltaMs: number | null = null;
    let speedDeltaKmh: number | null = null;
    if (referenceLap) {
      const refElapsedMs = timeAtDistanceMs(referenceLap.points, d);
      const refSpeedKmh = interpolateChannel(referenceLap.points, d, 'velocityKmh');
      timeDeltaMs = elapsedMs - refElapsedMs;
      speedDeltaKmh = speedKmh - refSpeedKmh;
    }

    return {
      label: `T${i + 1}`,
      distanceAlongLapM: d,
      snapshot: { speedKmh, leanAngleDeg, longAccG, elapsedMs },
      timeDeltaMs,
      speedDeltaKmh,
    };
  });
}
