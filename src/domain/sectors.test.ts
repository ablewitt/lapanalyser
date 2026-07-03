import { describe, it, expect } from 'vitest';
import { computeSectorResults, nearestTrackPoint } from './sectors';
import { makeStraightLap, makePointsLap } from './testHelpers';
import type { SectorBoundary } from './models';

function boundary(dist: number): SectorBoundary {
  return {
    id: `b-${dist}`,
    distanceAlongLapM: dist,
    gps: { lat: -28.261, lng: 152.037 },
    heading: 90,
  };
}

describe('computeSectorResults', () => {
  const lap = makePointsLap('lap', [
    { ms: 0,    dist: 0,   kmh: 100 },
    { ms: 1000, dist: 100, kmh: 100 },
    { ms: 2000, dist: 200, kmh: 100 },
    { ms: 3000, dist: 300, kmh: 100 },
  ]);

  it('returns empty array when no boundaries', () => {
    expect(computeSectorResults([], lap)).toHaveLength(0);
  });

  it('splits lap into N+1 sectors for N boundaries', () => {
    const results = computeSectorResults([boundary(100), boundary(200)], lap);
    expect(results).toHaveLength(3);
  });

  it('sector labels are S1, S2, S3, …', () => {
    const results = computeSectorResults([boundary(150)], lap);
    expect(results[0].label).toBe('S1');
    expect(results[1].label).toBe('S2');
  });

  it('sector times sum to total lap time', () => {
    const results = computeSectorResults([boundary(100), boundary(200)], lap);
    const total = results.reduce((s, r) => s + r.timeMs, 0);
    expect(total).toBeCloseTo(lap.lapTimeMs, 0);
  });

  it('sector distances sum to track length', () => {
    const results = computeSectorResults([boundary(100), boundary(200)], lap);
    const totalDist = results.reduce((s, r) => s + (r.endDistanceM - r.startDistanceM), 0);
    expect(totalDist).toBeCloseTo(lap.trackLengthM, 1);
  });

  it('sorts boundaries by distance (order in input does not matter)', () => {
    // Pass boundaries out of order
    const results = computeSectorResults([boundary(200), boundary(100)], lap);
    expect(results[0].startDistanceM).toBe(0);
    expect(results[0].endDistanceM).toBe(100);
    expect(results[1].startDistanceM).toBe(100);
    expect(results[1].endDistanceM).toBe(200);
  });

  it('works on a mean lap (elapsedMs[0] != 0)', () => {
    // If a mean lap has points[0].elapsedMs > 0, timeAtDistanceMs should still return lap-relative times
    const lap2 = makePointsLap('lap2', [
      { ms: 5000, dist: 0,   kmh: 100 },
      { ms: 6000, dist: 100, kmh: 100 },
      { ms: 7000, dist: 200, kmh: 100 },
    ]);
    const results = computeSectorResults([boundary(100)], lap2);
    // S1 = 0..100 = 1000 ms, S2 = 100..200 = 1000 ms
    expect(results[0].timeMs).toBeCloseTo(1000, 0);
    expect(results[1].timeMs).toBeCloseTo(1000, 0);
  });
});

describe('nearestTrackPoint', () => {
  const lap = makeStraightLap('lap', 10, 100);

  it('returns the closest point', () => {
    // Points are at lat -28.261 + i*0.00001 — point[0] is at -28.261
    const result = nearestTrackPoint(-28.261, 152.037, lap.points);
    expect(result).toBe(lap.points[0]);
  });

  it('returns last point when queried far past end', () => {
    const result = nearestTrackPoint(-28.200, 152.037, lap.points);
    expect(result).toBe(lap.points[lap.points.length - 1]);
  });

  it('returns a point from the array (not a copy)', () => {
    const result = nearestTrackPoint(-28.261, 152.037, lap.points);
    expect(lap.points).toContain(result);
  });
});
