import { describe, it, expect } from 'vitest';
import { buildMeanLap } from './groupLap';
import { makeStraightLap } from './testHelpers';

describe('buildMeanLap', () => {
  it('returns null for empty member array', () => {
    expect(buildMeanLap('group-mean-a', [])).toBeNull();
  });

  it('mean lap time is the arithmetic mean of member lap times', () => {
    const lapA = makeStraightLap('a', 200, 100); // ~200 points × 40 ms = 7960 ms
    const lapB = makeStraightLap('b', 200, 80);  // same number of points but different speed
    // Lap time is (numPoints-1) * dtMs = 199 * 40 = 7960 for both (same point count)
    // Override lapTimeMs to test averaging
    lapA.lapTimeMs = 60_000;
    lapB.lapTimeMs = 70_000;

    const mean = buildMeanLap('group-mean-a', [lapA, lapB]);
    expect(mean).not.toBeNull();
    expect(mean!.lapTimeMs).toBeCloseTo(65_000, 0);
  });

  it('mean lap metrics are averages of member metrics', () => {
    const lapA = makeStraightLap('a', 200, 100);
    const lapB = makeStraightLap('b', 200, 80);
    lapA.metrics.maxSpeedKmh = 120;
    lapB.metrics.maxSpeedKmh = 100;

    const mean = buildMeanLap('group-mean-a', [lapA, lapB]);
    expect(mean!.metrics.maxSpeedKmh).toBeCloseTo(110, 1);
  });

  it('mean GPS coordinates lie between member GPS coordinates', () => {
    const lapA = makeStraightLap('a', 200, 100);
    const lapB = makeStraightLap('b', 200, 100);
    // Shift lapB GPS slightly
    lapB.points.forEach((p, i) => {
      p.gps = { lat: -28.261 + i * 0.00002, lng: 152.040 };
    });

    const mean = buildMeanLap('group-mean-a', [lapA, lapB]);
    const midLng = mean!.points[50].gps.lng;
    // Should be between lapA (152.037) and lapB (152.040)
    expect(midLng).toBeGreaterThan(152.037);
    expect(midLng).toBeLessThan(152.040);
  });

  it('mean lap points have monotonically increasing distanceAlongLapM', () => {
    const laps = [makeStraightLap('a', 200, 100), makeStraightLap('b', 200, 90)];
    const mean = buildMeanLap('group-mean-a', laps);
    const dists = mean!.points.map(p => p.distanceAlongLapM);
    for (let i = 1; i < dists.length; i++) {
      expect(dists[i]).toBeGreaterThanOrEqual(dists[i - 1]);
    }
  });

  it('mean lap has events detected from its own telemetry', () => {
    // Use laps that have enough lean/braking to generate detectable events.
    // Straight laps won't generate APEX events; that's fine — we test events are
    // the product of detectEvents(meanLap), not member events.
    const lapA = makeStraightLap('a', 200, 100);
    const lapB = makeStraightLap('b', 200, 100);
    // Give member laps artificial events to confirm they are NOT copied
    lapA.events = [{ type: 'APEX', distanceAlongLapM: 100, elapsedMs: 1000, velocityKmh: 80, longAccG: 0, gps: { lat: -28, lng: 152 }, label: 'Apex 1', detail: { type: 'APEX', cornerIndex: 0, leanAngleDeg: 20 } }];
    lapB.events = [{ type: 'APEX', distanceAlongLapM: 100, elapsedMs: 1000, velocityKmh: 80, longAccG: 0, gps: { lat: -28, lng: 152 }, label: 'Apex 1', detail: { type: 'APEX', cornerIndex: 0, leanAngleDeg: 20 } }];

    const mean = buildMeanLap('group-mean-a', [lapA, lapB]);
    // Straight lap with no lean → no APEX events detected
    const apexEvents = mean!.events.filter(e => e.type === 'APEX');
    // The APEX events from members must NOT appear in the mean (which has 0 lean)
    expect(apexEvents).toHaveLength(0);
  });

  it('mean lap has no duplicate events', () => {
    const laps = [makeStraightLap('a', 200, 100), makeStraightLap('b', 200, 90)];
    const mean = buildMeanLap('group-mean-a', laps);
    const keys = mean!.events.map(e => `${e.type}-${e.distanceAlongLapM}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('assigns the provided id', () => {
    const mean = buildMeanLap('group-mean-b', [makeStraightLap('x', 100, 100)]);
    expect(mean!.id).toBe('group-mean-b');
  });

  it('sessionId is always group-means', () => {
    const mean = buildMeanLap('group-mean-a', [makeStraightLap('x', 100, 100)]);
    expect(mean!.sessionId).toBe('group-means');
  });

  it('single-member mean equals the member (within grid resolution)', () => {
    const lap = makeStraightLap('a', 200, 100);
    lap.lapTimeMs = 60_000;
    const mean = buildMeanLap('group-mean-a', [lap]);
    // Lap time should match
    expect(mean!.lapTimeMs).toBeCloseTo(lap.lapTimeMs, 0);
  });
});
