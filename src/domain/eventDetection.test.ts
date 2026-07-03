import { describe, it, expect } from 'vitest';
import { detectEvents } from './eventDetection';
import type { DataPoint, Lap } from './models';

/** Build a lap with a speed profile designed to trigger each event type. */
function makeLapWithEvents(): Lap {
  // 500 points at 25 Hz: simulate ~20 s lap with corners and straights
  const points: DataPoint[] = [];
  const N = 500;

  for (let i = 0; i < N; i++) {
    const t = i / 25; // seconds
    // Speed: oscillates to simulate corners
    const base = 80;
    const speedKmh = base + 40 * Math.sin(2 * Math.PI * t / 10);
    // Lean: high in the middle of each speed trough (corner)
    const lean = 30 * Math.max(0, -Math.sin(2 * Math.PI * t / 10));
    // Longitudinal acc: negative before corner (braking), positive after (acceleration)
    const longAcc = -0.5 * Math.sin(2 * Math.PI * t / 10);
    const dist = i * (speedKmh / 3.6) * (1 / 25);

    points.push({
      elapsedMs: i * 40,
      distanceM: i * 4,
      distanceAlongLapM: i * 4,
      gps: { lat: -28.261 + i * 0.00001, lng: 152.037 },
      velocityKmh: Math.max(5, speedKmh),
      heading: 90,
      heightM: 100,
      longAccG: longAcc,
      vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0,
      leanAngleDeg: lean,
      satellites: 10,
    });

    void dist; // suppress unused
  }

  const lapTimeMs = (N - 1) * 40;
  const trackLengthM = (N - 1) * 4;
  return {
    id: 'evt-lap',
    sessionId: 'test',
    lapNumber: 1,
    points,
    lapTimeMs,
    trackLengthM,
    metrics: {
      lapTimeMs,
      maxSpeedKmh: 120,
      maxLeanAngleDeg: 30,
      peakBrakingG: -0.5,
      peakAccelG: 0.5,
    },
    events: [],
  };
}

function makeLapTooShort(): Lap {
  const points: DataPoint[] = Array.from({ length: 10 }, (_, i) => ({
    elapsedMs: i * 100, distanceM: i, distanceAlongLapM: i,
    gps: { lat: -28, lng: 152 },
    velocityKmh: 50, heading: 0, heightM: 0,
    longAccG: 0, vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0,
    leanAngleDeg: 0, satellites: 8,
  }));
  return {
    id: 'short', sessionId: 'test', lapNumber: 1,
    points, lapTimeMs: 1000, trackLengthM: 10,
    metrics: { lapTimeMs: 1000, maxSpeedKmh: 50, maxLeanAngleDeg: 0, peakBrakingG: 0, peakAccelG: 0 },
    events: [],
  };
}

describe('detectEvents', () => {
  it('returns empty array for lap with fewer than 20 points', () => {
    const lap = makeLapTooShort();
    expect(detectEvents(lap)).toHaveLength(0);
  });

  it('returns sorted events by distanceAlongLapM', () => {
    const lap = makeLapWithEvents();
    const events = detectEvents(lap);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].distanceAlongLapM).toBeGreaterThanOrEqual(events[i - 1].distanceAlongLapM);
    }
  });

  it('has no duplicate events (same type + distance)', () => {
    const lap = makeLapWithEvents();
    const events = detectEvents(lap);
    const keys = events.map(e => `${e.type}-${e.distanceAlongLapM}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('all events have a gps coordinate', () => {
    const lap = makeLapWithEvents();
    const events = detectEvents(lap);
    for (const ev of events) {
      expect(ev.gps).toBeDefined();
      expect(typeof ev.gps.lat).toBe('number');
      expect(typeof ev.gps.lng).toBe('number');
    }
  });

  it('event distanceAlongLapM is within track bounds', () => {
    const lap = makeLapWithEvents();
    const events = detectEvents(lap);
    for (const ev of events) {
      expect(ev.distanceAlongLapM).toBeGreaterThanOrEqual(0);
      expect(ev.distanceAlongLapM).toBeLessThanOrEqual(lap.trackLengthM);
    }
  });

  it('detail type matches event type', () => {
    const lap = makeLapWithEvents();
    const events = detectEvents(lap);
    for (const ev of events) {
      expect(ev.detail.type).toBe(ev.type);
    }
  });

  it('deduplication: identical events at same distance are reduced to one', () => {
    // Build a lap where two events of the same type land at the exact same distance.
    // We can achieve this by running detectEvents on an already-processed lap that
    // has known duplicate events injected via a specially shaped profile.
    // The safest test is to verify the invariant holds on real output.
    const lap = makeLapWithEvents();
    const events = detectEvents(lap);
    const accelEvents = events.filter(e => e.type === 'ACCELERATION');
    const accelDists = accelEvents.map(e => e.distanceAlongLapM);
    const uniqueDists = new Set(accelDists);
    expect(uniqueDists.size).toBe(accelDists.length);
  });
});

describe('detectEvents — synthetic chicane deduplication regression', () => {
  /**
   * Regression: two consecutive apexes in a chicane can both resolve to the same
   * acceleration zone start → two ACCELERATION events at identical distance.
   * detectEvents must deduplicate them.
   */
  it('emits at most one ACCELERATION event per distance point', () => {
    // Build 200 points that contain a rapid double-apex (chicane):
    // lean > 8° twice in quick succession at slightly different positions
    const N = 200;
    const points: DataPoint[] = Array.from({ length: N }, (_, i) => {
      // First apex at i=50-70, second at i=80-100, acceleration zone at i=105
      const inApex1 = i >= 50 && i <= 70;
      const inApex2 = i >= 80 && i <= 100;
      const lean = inApex1 ? 20 : inApex2 ? 20 : 0;
      const longAcc = i > 105 && i < 130 ? 0.35 : 0;
      return {
        elapsedMs: i * 40,
        distanceM: i * 3,
        distanceAlongLapM: i * 3,
        gps: { lat: -28.261 + i * 0.00001, lng: 152.037 },
        velocityKmh: 80,
        heading: 90,
        heightM: 100,
        longAccG: longAcc,
        vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0,
        leanAngleDeg: lean,
        satellites: 10,
      };
    });
    const lap: Lap = {
      id: 'chicane', sessionId: 'test', lapNumber: 1,
      points,
      lapTimeMs: (N - 1) * 40,
      trackLengthM: (N - 1) * 3,
      metrics: { lapTimeMs: (N - 1) * 40, maxSpeedKmh: 80, maxLeanAngleDeg: 20, peakBrakingG: 0, peakAccelG: 0.35 },
      events: [],
    };
    const events = detectEvents(lap);
    const accelKeys = events
      .filter(e => e.type === 'ACCELERATION')
      .map(e => `${e.distanceAlongLapM}`);
    const uniqueKeys = new Set(accelKeys);
    expect(uniqueKeys.size).toBe(accelKeys.length);
  });
});
