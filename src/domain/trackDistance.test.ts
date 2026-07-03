import { describe, it, expect } from 'vitest';
import { timeAtDistanceMs, buildDistanceGrid, buildTimeGrid } from './trackDistance';
import { makeStraightLap, makePointsLap } from './testHelpers';

// ── timeAtDistanceMs ──────────────────────────────────────────────────────────

describe('timeAtDistanceMs', () => {
  const lap = makePointsLap('lap', [
    { ms: 0,    dist: 0 },
    { ms: 1000, dist: 100 },
    { ms: 2000, dist: 200 },
    { ms: 3000, dist: 300 },
  ].map(p => ({ ...p, kmh: 100 })));

  it('returns 0 at the start', () => {
    expect(timeAtDistanceMs(lap.points, 0)).toBe(0);
  });

  it('returns lap time at the end', () => {
    expect(timeAtDistanceMs(lap.points, 300)).toBeCloseTo(3000, 0);
  });

  it('interpolates correctly at midpoint', () => {
    expect(timeAtDistanceMs(lap.points, 150)).toBeCloseTo(1500, 0);
  });

  it('clamps below start to 0', () => {
    expect(timeAtDistanceMs(lap.points, -50)).toBe(0);
  });

  it('clamps past end to lap elapsed time', () => {
    expect(timeAtDistanceMs(lap.points, 999)).toBeCloseTo(3000, 0);
  });

  it('works when elapsedMs does not start at 0', () => {
    const lap2 = makePointsLap('lap2', [
      { ms: 500, dist: 0, kmh: 100 },
      { ms: 1500, dist: 100, kmh: 100 },
      { ms: 2500, dist: 200, kmh: 100 },
    ]);
    // Returns lap-relative time: at dist=100, elapsed = 1000 ms into the lap
    expect(timeAtDistanceMs(lap2.points, 100)).toBeCloseTo(1000, 0);
  });
});

// ── buildDistanceGrid ─────────────────────────────────────────────────────────

describe('buildDistanceGrid', () => {
  it('returns empty array for no laps', () => {
    expect(buildDistanceGrid([])).toHaveLength(0);
  });

  it('produces one series per lap', () => {
    const laps = [makeStraightLap('a', 200, 100), makeStraightLap('b', 200, 90)];
    const grids = buildDistanceGrid(laps);
    expect(grids).toHaveLength(2);
  });

  it('all series share the same distance axis', () => {
    const laps = [makeStraightLap('a', 200, 100), makeStraightLap('b', 200, 90)];
    const grids = buildDistanceGrid(laps, 5);
    expect(grids[0].distances).toEqual(grids[1].distances);
  });

  it('distance axis starts at 0 with correct step', () => {
    const lap = makeStraightLap('a', 100, 100);
    const [grid] = buildDistanceGrid([lap], 10);
    expect(grid.distances[0]).toBe(0);
    expect(grid.distances[1]).toBe(10);
  });

  it('reference lap (index 0) has timeDeltaS of 0 everywhere', () => {
    const laps = [makeStraightLap('a', 200, 100), makeStraightLap('b', 200, 90)];
    const grids = buildDistanceGrid(laps);
    const refDelta = grids[0].timeDeltaS;
    refDelta.forEach(d => expect(d).toBeCloseTo(0, 5));
  });

  it('slower lap has positive timeDeltaS vs faster reference', () => {
    // lap a: 100 km/h; lap b: 80 km/h (slower → arrives later → positive delta)
    const lapFast = makeStraightLap('fast', 200, 100);
    const lapSlow = makeStraightLap('slow', 200, 80);
    const grids = buildDistanceGrid([lapFast, lapSlow]);
    // At any distance > 0, slow lap should be behind in time
    const delta = grids[1].timeDeltaS;
    expect(delta[delta.length - 1]).toBeGreaterThan(0);
  });

  it('velocity values match expected speed at each distance', () => {
    const speedKmh = 100;
    const lap = makeStraightLap('a', 300, speedKmh);
    const [grid] = buildDistanceGrid([lap], 2);
    // All interior velocity values should equal speedKmh
    grid.velocityKmh.slice(1, -1).forEach(v => {
      expect(v).toBeCloseTo(speedKmh, 1);
    });
  });
});

// ── buildTimeGrid ─────────────────────────────────────────────────────────────

describe('buildTimeGrid', () => {
  it('returns empty for no laps', () => {
    expect(buildTimeGrid([])).toHaveLength(0);
  });

  it('produces one series per lap', () => {
    const laps = [makeStraightLap('a', 200, 100), makeStraightLap('b', 200, 90)];
    const grids = buildTimeGrid(laps);
    expect(grids).toHaveLength(2);
  });

  it('all series share the same time axis', () => {
    const laps = [makeStraightLap('a', 200, 100), makeStraightLap('b', 200, 90)];
    const grids = buildTimeGrid(laps);
    expect(grids[0].times).toEqual(grids[1].times);
  });

  it('reference lap has distanceDeltaM of 0 everywhere', () => {
    const laps = [makeStraightLap('a', 200, 100), makeStraightLap('b', 200, 90)];
    const grids = buildTimeGrid(laps);
    grids[0].distanceDeltaM.forEach(d => expect(d).toBeCloseTo(0, 5));
  });

  it('faster lap has positive distanceDeltaM vs slower reference', () => {
    const lapSlow = makeStraightLap('slow', 200, 80);
    const lapFast = makeStraightLap('fast', 200, 100);
    const grids = buildTimeGrid([lapSlow, lapFast]);
    const delta = grids[1].distanceDeltaM;
    expect(delta[delta.length - 1]).toBeGreaterThan(0);
  });
});
