/**
 * Integration tests: parse real VBO session files from the sessions/ directory.
 *
 * Three tracks:
 *   - Morgan Park Raceway  (QLD): lat ≈ -28.26°,  lng ≈ +152.04°
 *   - Lakeside Park        (QLD): lat ≈ -27.23°,  lng ≈ +152.97°
 *   - Queensland Raceway   (QLD): lat ≈ -27.69°,  lng ≈ +152.99°
 *
 * Tests validate:
 *   - Venue string, GPS bounding box, lap count, lap time plausibility
 *   - Events detected and non-empty for full laps
 *   - No duplicate events (regression: chicane deduplication fix)
 *   - Group mean lap round-trip: mean time, GPS bounds, no duplicate events
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import VboParser from './index';
import type { Lap } from '../../domain/models';
import { buildMeanLap } from '../../domain/groupLap';
import { computeSectorResults } from '../../domain/sectors';

const SESSIONS = join(process.cwd(), 'sessions');

function readSession(filename: string) {
  const content = readFileSync(join(SESSIONS, filename), 'utf-8');
  return VboParser.parse(filename, content);
}

function assertNoDuplicateEvents(lap: Lap) {
  const keys = lap.events.map(e => `${e.type}-${e.distanceAlongLapM}`);
  const unique = new Set(keys);
  expect(unique.size).toBe(keys.length);
}

// ── Morgan Park ───────────────────────────────────────────────────────────────

const MORGAN_PARK_BOUNDS = {
  latMin: -28.30, latMax: -28.22,
  lngMin: 152.00, lngMax: 152.08,
};

const MORGAN_PARK_LAP_TIME_MS = { min: 60_000, max: 240_000 };
const MORGAN_PARK_TRACK_LENGTH_M = { min: 2000, max: 3000 };

describe('Morgan Park — 14-06-2026 09-59.vbo', () => {
  const { session, warnings } = readSession('RaceBox Track Sessionon 14-06-2026 09-59.vbo');

  it('parses venue as Morgan Park', () => {
    expect(session.venue.toLowerCase()).toContain('morgan');
  });

  it('has at least 2 complete laps', () => {
    expect(session.laps.length).toBeGreaterThanOrEqual(2);
  });

  it('all lap GPS coordinates fall within Morgan Park bounds', () => {
    for (const lap of session.laps) {
      for (const p of lap.points) {
        expect(p.gps.lat).toBeGreaterThan(MORGAN_PARK_BOUNDS.latMin);
        expect(p.gps.lat).toBeLessThan(MORGAN_PARK_BOUNDS.latMax);
        expect(p.gps.lng).toBeGreaterThan(MORGAN_PARK_BOUNDS.lngMin);
        expect(p.gps.lng).toBeLessThan(MORGAN_PARK_BOUNDS.lngMax);
      }
    }
  });

  it('all lap times are within plausible range', () => {
    for (const lap of session.laps) {
      expect(lap.lapTimeMs).toBeGreaterThan(MORGAN_PARK_LAP_TIME_MS.min);
      expect(lap.lapTimeMs).toBeLessThan(MORGAN_PARK_LAP_TIME_MS.max);
    }
  });

  it('track length is plausible', () => {
    for (const lap of session.laps) {
      expect(lap.trackLengthM).toBeGreaterThan(MORGAN_PARK_TRACK_LENGTH_M.min);
      expect(lap.trackLengthM).toBeLessThan(MORGAN_PARK_TRACK_LENGTH_M.max);
    }
  });

  it('events are detected for each complete lap', () => {
    for (const lap of session.laps) {
      expect(lap.events.length).toBeGreaterThan(0);
    }
  });

  it('no duplicate events on any lap', () => {
    for (const lap of session.laps) assertNoDuplicateEvents(lap);
  });

  it('no critical parser warnings', () => {
    const critical = warnings.filter(w => w.includes('No data'));
    expect(critical).toHaveLength(0);
  });

  it('start/finish gate is within Morgan Park bounds', () => {
    expect(session.gate.p1.lat).toBeGreaterThan(MORGAN_PARK_BOUNDS.latMin);
    expect(session.gate.p1.lat).toBeLessThan(MORGAN_PARK_BOUNDS.latMax);
  });

  it('lap points have monotonically non-decreasing distanceAlongLapM', () => {
    for (const lap of session.laps.slice(0, 3)) {
      for (let i = 1; i < lap.points.length; i++) {
        expect(lap.points[i].distanceAlongLapM).toBeGreaterThanOrEqual(
          lap.points[i - 1].distanceAlongLapM - 0.01,
        );
      }
    }
  });

  it('event distances are within track bounds', () => {
    for (const lap of session.laps) {
      for (const ev of lap.events) {
        expect(ev.distanceAlongLapM).toBeGreaterThanOrEqual(0);
        expect(ev.distanceAlongLapM).toBeLessThanOrEqual(lap.trackLengthM + 1);
      }
    }
  });
});

describe('Morgan Park — 14-06-2026 11-53 (2).vbo', () => {
  const { session } = readSession('RaceBox Track Sessionon 14-06-2026 11-53 (2).vbo');

  it('parses venue as Morgan Park', () => {
    expect(session.venue.toLowerCase()).toContain('morgan');
  });

  it('has at least 2 complete laps', () => {
    expect(session.laps.length).toBeGreaterThanOrEqual(2);
  });

  it('lap times are plausible', () => {
    for (const lap of session.laps) {
      expect(lap.lapTimeMs).toBeGreaterThan(MORGAN_PARK_LAP_TIME_MS.min);
      expect(lap.lapTimeMs).toBeLessThan(MORGAN_PARK_LAP_TIME_MS.max);
    }
  });

  it('no duplicate events', () => {
    for (const lap of session.laps) assertNoDuplicateEvents(lap);
  });
});

describe('Morgan Park — Ben 14-06-2026 11-38.vbo', () => {
  const { session } = readSession('Ben RaceBox Track Sessionon 14-06-2026 11-38.vbo');

  it('parses venue as Morgan Park', () => {
    expect(session.venue.toLowerCase()).toContain('morgan');
  });

  it('has at least 2 complete laps', () => {
    expect(session.laps.length).toBeGreaterThanOrEqual(2);
  });

  it('no duplicate events', () => {
    for (const lap of session.laps) assertNoDuplicateEvents(lap);
  });
});

describe('Morgan Park — group mean lap (two riders, same day)', () => {
  const { session: sess1 } = readSession('RaceBox Track Sessionon 14-06-2026 09-59.vbo');
  const { session: sess2 } = readSession('Ben RaceBox Track Sessionon 14-06-2026 11-38.vbo');

  it('builds a mean lap without throwing', () => {
    const members = [sess1.laps[0], sess2.laps[0]];
    expect(() => buildMeanLap('group-mean-a', members)).not.toThrow();
  });

  it('mean lap time is between the two member lap times', () => {
    const lapA = sess1.laps[0];
    const lapB = sess2.laps[0];
    const mean = buildMeanLap('group-mean-a', [lapA, lapB])!;
    const minT = Math.min(lapA.lapTimeMs, lapB.lapTimeMs);
    const maxT = Math.max(lapA.lapTimeMs, lapB.lapTimeMs);
    expect(mean.lapTimeMs).toBeGreaterThanOrEqual(minT);
    expect(mean.lapTimeMs).toBeLessThanOrEqual(maxT);
  });

  it('mean lap GPS stays within Morgan Park bounds', () => {
    const mean = buildMeanLap('group-mean-a', [sess1.laps[0], sess2.laps[0]])!;
    for (const p of mean.points) {
      expect(p.gps.lat).toBeGreaterThan(MORGAN_PARK_BOUNDS.latMin);
      expect(p.gps.lat).toBeLessThan(MORGAN_PARK_BOUNDS.latMax);
      expect(p.gps.lng).toBeGreaterThan(MORGAN_PARK_BOUNDS.lngMin);
      expect(p.gps.lng).toBeLessThan(MORGAN_PARK_BOUNDS.lngMax);
    }
  });

  it('mean lap has events detected', () => {
    const mean = buildMeanLap('group-mean-a', [sess1.laps[0], sess2.laps[0]])!;
    expect(mean.events.length).toBeGreaterThan(0);
  });

  it('mean lap has no duplicate events', () => {
    const mean = buildMeanLap('group-mean-a', [sess1.laps[0], sess2.laps[0]])!;
    assertNoDuplicateEvents(mean);
  });
});

// ── Lakeside Park ─────────────────────────────────────────────────────────────

const LAKESIDE_BOUNDS = {
  latMin: -27.30, latMax: -27.15,
  lngMin: 152.90, lngMax: 153.05,
};

const LAKESIDE_LAP_TIME_MS = { min: 50_000, max: 180_000 };
const LAKESIDE_TRACK_LENGTH_M = { min: 1000, max: 3000 };

describe('Lakeside — 03-08-2025 14-57.vbo', () => {
  const { session } = readSession('RaceBox Track Sessionon 03-08-2025 14-57.vbo');

  it('parses venue as Lakeside', () => {
    expect(session.venue.toLowerCase()).toContain('lakeside');
  });

  it('has at least 2 complete laps', () => {
    expect(session.laps.length).toBeGreaterThanOrEqual(2);
  });

  it('all lap GPS coordinates fall within Lakeside bounds', () => {
    for (const lap of session.laps) {
      for (const p of lap.points) {
        expect(p.gps.lat).toBeGreaterThan(LAKESIDE_BOUNDS.latMin);
        expect(p.gps.lat).toBeLessThan(LAKESIDE_BOUNDS.latMax);
        expect(p.gps.lng).toBeGreaterThan(LAKESIDE_BOUNDS.lngMin);
        expect(p.gps.lng).toBeLessThan(LAKESIDE_BOUNDS.lngMax);
      }
    }
  });

  it('all lap times are within plausible range for Lakeside', () => {
    for (const lap of session.laps) {
      expect(lap.lapTimeMs).toBeGreaterThan(LAKESIDE_LAP_TIME_MS.min);
      expect(lap.lapTimeMs).toBeLessThan(LAKESIDE_LAP_TIME_MS.max);
    }
  });

  it('track length is plausible', () => {
    for (const lap of session.laps) {
      expect(lap.trackLengthM).toBeGreaterThan(LAKESIDE_TRACK_LENGTH_M.min);
      expect(lap.trackLengthM).toBeLessThan(LAKESIDE_TRACK_LENGTH_M.max);
    }
  });

  it('events are detected for each complete lap', () => {
    for (const lap of session.laps) {
      expect(lap.events.length).toBeGreaterThan(0);
    }
  });

  it('no duplicate events on any lap', () => {
    for (const lap of session.laps) assertNoDuplicateEvents(lap);
  });

  it('start/finish gate is within Lakeside bounds', () => {
    expect(session.gate.p1.lat).toBeGreaterThan(LAKESIDE_BOUNDS.latMin);
    expect(session.gate.p1.lat).toBeLessThan(LAKESIDE_BOUNDS.latMax);
  });

  it('all lap points have non-decreasing elapsedMs', () => {
    for (const lap of session.laps.slice(0, 3)) {
      for (let i = 1; i < lap.points.length; i++) {
        expect(lap.points[i].elapsedMs).toBeGreaterThanOrEqual(lap.points[i - 1].elapsedMs);
      }
    }
  });
});

// ── Queensland Raceway ────────────────────────────────────────────────────────

const QR_BOUNDS = {
  latMin: -27.75, latMax: -27.65,
  lngMin: 152.60, lngMax: 153.05,
};

const QR_LAP_TIME_MS = { min: 60_000, max: 240_000 };
const QR_TRACK_LENGTH_M = { min: 2000, max: 4000 };

describe('Queensland Raceway — 03-04-2026 18-05.vbo', () => {
  const { session } = readSession('RaceBox Track Sessionon 03-04-2026 18-05.vbo');

  it('parses venue as Queensland Raceway', () => {
    expect(session.venue.toLowerCase()).toContain('queensland');
  });

  it('has at least 2 complete laps', () => {
    expect(session.laps.length).toBeGreaterThanOrEqual(2);
  });

  it('all lap GPS coordinates fall within Queensland Raceway bounds', () => {
    for (const lap of session.laps) {
      for (const p of lap.points) {
        expect(p.gps.lat).toBeGreaterThan(QR_BOUNDS.latMin);
        expect(p.gps.lat).toBeLessThan(QR_BOUNDS.latMax);
        expect(p.gps.lng).toBeGreaterThan(QR_BOUNDS.lngMin);
        expect(p.gps.lng).toBeLessThan(QR_BOUNDS.lngMax);
      }
    }
  });

  it('all lap times are within plausible range', () => {
    for (const lap of session.laps) {
      expect(lap.lapTimeMs).toBeGreaterThan(QR_LAP_TIME_MS.min);
      expect(lap.lapTimeMs).toBeLessThan(QR_LAP_TIME_MS.max);
    }
  });

  it('track length is plausible', () => {
    for (const lap of session.laps) {
      expect(lap.trackLengthM).toBeGreaterThan(QR_TRACK_LENGTH_M.min);
      expect(lap.trackLengthM).toBeLessThan(QR_TRACK_LENGTH_M.max);
    }
  });

  it('events are detected for each complete lap', () => {
    for (const lap of session.laps) {
      expect(lap.events.length).toBeGreaterThan(0);
    }
  });

  it('no duplicate events on any lap', () => {
    for (const lap of session.laps) assertNoDuplicateEvents(lap);
  });
});

describe('Queensland Raceway — 03-04-2026 18-56.vbo', () => {
  const { session } = readSession('RaceBox Track Sessionon 03-04-2026 18-56.vbo');

  it('parses venue as Queensland Raceway', () => {
    expect(session.venue.toLowerCase()).toContain('queensland');
  });

  it('has at least 1 complete lap (short session)', () => {
    // This appears to be a partial session — only one crossing detected.
    expect(session.laps.length).toBeGreaterThanOrEqual(1);
  });

  it('no duplicate events', () => {
    for (const lap of session.laps) assertNoDuplicateEvents(lap);
  });
});

describe('Queensland Raceway — group mean lap from two sessions', () => {
  const { session: sess1 } = readSession('RaceBox Track Sessionon 03-04-2026 18-05.vbo');
  const { session: sess2 } = readSession('RaceBox Track Sessionon 03-04-2026 18-56.vbo');

  it('builds a mean lap without throwing', () => {
    expect(() => buildMeanLap('group-mean-a', [sess1.laps[0], sess2.laps[0]])).not.toThrow();
  });

  it('mean lap time is between the two member lap times', () => {
    const lapA = sess1.laps[0];
    const lapB = sess2.laps[0];
    const mean = buildMeanLap('group-mean-a', [lapA, lapB])!;
    const minT = Math.min(lapA.lapTimeMs, lapB.lapTimeMs);
    const maxT = Math.max(lapA.lapTimeMs, lapB.lapTimeMs);
    expect(mean.lapTimeMs).toBeGreaterThanOrEqual(minT);
    expect(mean.lapTimeMs).toBeLessThanOrEqual(maxT);
  });

  it('sector results on mean lap sum to lap time', () => {
    const mean = buildMeanLap('group-mean-a', [sess1.laps[0], sess2.laps[0]])!;
    const boundaries = [
      { id: 'b1', distanceAlongLapM: mean.trackLengthM * 0.33, gps: { lat: -27.69, lng: 152.99 }, heading: 0 },
      { id: 'b2', distanceAlongLapM: mean.trackLengthM * 0.66, gps: { lat: -27.69, lng: 152.99 }, heading: 0 },
    ];
    const results = computeSectorResults(boundaries, mean);
    const total = results.reduce((s, r) => s + r.timeMs, 0);
    expect(total).toBeCloseTo(mean.lapTimeMs, 0);
  });

  it('no duplicate events on mean lap', () => {
    const mean = buildMeanLap('group-mean-a', [sess1.laps[0], sess2.laps[0]])!;
    assertNoDuplicateEvents(mean);
  });
});

// ── Morgan Park — third session ───────────────────────────────────────────────

describe('Morgan Park — 13-05-2026 15-39.vbo', () => {
  const { session } = readSession('RaceBox Track Sessionon 13-05-2026 15-39.vbo');

  it('parses venue as Morgan Park', () => {
    expect(session.venue.toLowerCase()).toContain('morgan');
  });

  it('has at least 2 complete laps', () => {
    expect(session.laps.length).toBeGreaterThanOrEqual(2);
  });

  it('no duplicate events', () => {
    for (const lap of session.laps) assertNoDuplicateEvents(lap);
  });

  it('event distances are within track bounds', () => {
    for (const lap of session.laps) {
      for (const ev of lap.events) {
        expect(ev.distanceAlongLapM).toBeGreaterThanOrEqual(0);
        expect(ev.distanceAlongLapM).toBeLessThanOrEqual(lap.trackLengthM + 1);
      }
    }
  });
});
