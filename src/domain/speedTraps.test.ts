import { describe, it, expect } from 'vitest';
import { computeSpeedTrapResults } from './speedTraps';
import type { SpeedTrap } from './models';
import { makePointsLap } from './testHelpers';

const lap = makePointsLap('lap', [
  { ms: 0,    dist: 0,   kmh: 80,  lean: 5,  acc: 0 },
  { ms: 1000, dist: 100, kmh: 100, lean: 10, acc: -0.5 },
  { ms: 2000, dist: 200, kmh: 120, lean: 15, acc: 0.3 },
  { ms: 3000, dist: 300, kmh: 60,  lean: 0,  acc: -1.0 },
]);

function makeTrap(id: string, distanceAlongLapM: number): SpeedTrap {
  return { id, distanceAlongLapM, gps: { lat: -28.261, lng: 152.037 }, heading: 90 };
}

describe('computeSpeedTrapResults', () => {
  it('returns empty array when no traps', () => {
    expect(computeSpeedTrapResults([], lap)).toHaveLength(0);
  });

  it('returns one result per trap', () => {
    const traps = [makeTrap('a', 100), makeTrap('b', 200)];
    expect(computeSpeedTrapResults(traps, lap)).toHaveLength(2);
  });

  it('labels are T1, T2, T3 in distance order', () => {
    const traps = [makeTrap('a', 200), makeTrap('b', 100)];
    const results = computeSpeedTrapResults(traps, lap);
    expect(results[0].label).toBe('T1');
    expect(results[1].label).toBe('T2');
    expect(results[0].distanceAlongLapM).toBe(100);
    expect(results[1].distanceAlongLapM).toBe(200);
  });

  it('sorts traps by distanceAlongLapM regardless of input order', () => {
    const traps = [makeTrap('far', 300), makeTrap('near', 100)];
    const results = computeSpeedTrapResults(traps, lap);
    expect(results[0].distanceAlongLapM).toBe(100);
    expect(results[1].distanceAlongLapM).toBe(300);
  });

  it('snapshot speedKmh matches interpolated velocity at trap distance', () => {
    const traps = [makeTrap('a', 100)];
    const [r] = computeSpeedTrapResults(traps, lap);
    expect(r.snapshot.speedKmh).toBeCloseTo(100, 1);
  });

  it('snapshot leanAngleDeg matches interpolated value at trap distance', () => {
    const traps = [makeTrap('a', 100)];
    const [r] = computeSpeedTrapResults(traps, lap);
    expect(r.snapshot.leanAngleDeg).toBeCloseTo(10, 1);
  });

  it('snapshot elapsedMs is lap-relative', () => {
    const traps = [makeTrap('a', 100)];
    const [r] = computeSpeedTrapResults(traps, lap);
    expect(r.snapshot.elapsedMs).toBeCloseTo(1000, 0);
  });

  it('timeDeltaMs and speedDeltaKmh are null with no reference lap', () => {
    const traps = [makeTrap('a', 100)];
    const [r] = computeSpeedTrapResults(traps, lap);
    expect(r.timeDeltaMs).toBeNull();
    expect(r.speedDeltaKmh).toBeNull();
  });

  it('timeDeltaMs is 0 when lap equals reference lap', () => {
    const traps = [makeTrap('a', 150)];
    const [r] = computeSpeedTrapResults(traps, lap, lap);
    expect(r.timeDeltaMs).toBeCloseTo(0, 1);
  });

  it('timeDeltaMs is positive when lap is slower than reference', () => {
    const refLap = makePointsLap('ref', [
      { ms: 0,    dist: 0,   kmh: 100 },
      { ms: 500,  dist: 100, kmh: 100 },
      { ms: 1000, dist: 200, kmh: 100 },
      { ms: 1500, dist: 300, kmh: 100 },
    ]);
    const slowLap = makePointsLap('slow', [
      { ms: 0,    dist: 0,   kmh: 80 },
      { ms: 800,  dist: 100, kmh: 80 },
      { ms: 1600, dist: 200, kmh: 80 },
      { ms: 2400, dist: 300, kmh: 80 },
    ]);
    const traps = [makeTrap('a', 100)];
    const [r] = computeSpeedTrapResults(traps, slowLap, refLap);
    expect(r.timeDeltaMs).toBeGreaterThan(0);
  });

  it('speedDeltaKmh is negative when lap is slower than reference', () => {
    const refLap = makePointsLap('ref', [
      { ms: 0,    dist: 0,   kmh: 100 },
      { ms: 1000, dist: 100, kmh: 100 },
    ]);
    const slowLap = makePointsLap('slow', [
      { ms: 0,    dist: 0,   kmh: 80 },
      { ms: 1000, dist: 100, kmh: 80 },
    ]);
    const traps = [makeTrap('a', 50)];
    const [r] = computeSpeedTrapResults(traps, slowLap, refLap);
    expect(r.speedDeltaKmh).toBeCloseTo(-20, 1);
  });
});
