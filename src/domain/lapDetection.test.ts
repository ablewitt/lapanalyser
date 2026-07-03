import { describe, it, expect } from 'vitest';
import { detectLapCrossings, assembleLaps } from './lapDetection';
import type { DataPoint, Gate, GpsCoord } from './models';

const ORIGIN: GpsCoord = { lat: -28.261, lng: 152.037 };

function makeGate(lat: number, lng: number, halfWidthM = 10): Gate {
  const dlng = halfWidthM / (6371000 * Math.cos(lat * Math.PI / 180) * Math.PI / 180);
  return {
    p1: { lat, lng: lng - dlng },
    p2: { lat, lng: lng + dlng },
    label: 'S/F',
  };
}

/** Build a circuit: N laps of a straight 500 m course, crossing gate at dist=0. */
function makeCircuitPoints(numLaps: number, lapTimeMs = 60_000, speedKmh = 100): DataPoint[] {
  const trackM = (speedKmh / 3.6) * (lapTimeMs / 1000);
  const dtMs = 100;
  const dxM = (speedKmh / 3.6) * (dtMs / 1000);
  const ptsPerLap = Math.ceil(trackM / dxM);
  const points: DataPoint[] = [];
  let totalDist = 0;
  let totalMs = 0;

  // A bit past the gate so we cross it going forward on each lap
  const gateLat = ORIGIN.lat + 0.00001; // just north of origin
  const gateLng = ORIGIN.lng;

  for (let lap = 0; lap < numLaps + 1; lap++) {
    for (let i = 0; i < ptsPerLap; i++) {
      // Move north (increasing lat) to simulate going around the track
      const pLat = ORIGIN.lat + ((totalDist % trackM) / trackM) * 0.002;
      points.push({
        elapsedMs: totalMs,
        distanceM: totalDist,
        distanceAlongLapM: totalDist,
        gps: { lat: pLat, lng: gateLng },
        velocityKmh: speedKmh,
        heading: 0,
        heightM: 100,
        longAccG: 0, vertAccG: 0,
        xGyro: 0, yGyro: 0, zGyro: 0,
        leanAngleDeg: 0,
        satellites: 10,
      });
      totalDist += dxM;
      totalMs += dtMs;
    }
  }
  return points;
}

describe('detectLapCrossings', () => {
  it('returns empty for points that never cross the gate', () => {
    const points: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
      elapsedMs: i * 100,
      distanceM: i * 10,
      distanceAlongLapM: i * 10,
      gps: { lat: ORIGIN.lat, lng: ORIGIN.lng + i * 0.001 }, // moves away from gate
      velocityKmh: 80,
      heading: 90,
      heightM: 100,
      longAccG: 0, vertAccG: 0,
      xGyro: 0, yGyro: 0, zGyro: 0,
      leanAngleDeg: 0,
      satellites: 10,
    }));
    const gate = makeGate(ORIGIN.lat, ORIGIN.lng + 5); // gate far off route
    const crossings = detectLapCrossings(points, gate, ORIGIN);
    expect(crossings).toHaveLength(0);
  });

  it('ignores crossings below MIN_SPEED_KMH (30 km/h)', () => {
    const points: DataPoint[] = [
      { elapsedMs: 0, distanceM: 0, distanceAlongLapM: 0, gps: { lat: ORIGIN.lat - 0.0001, lng: ORIGIN.lng }, velocityKmh: 10, heading: 0, heightM: 100, longAccG: 0, vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0, leanAngleDeg: 0, satellites: 10 },
      { elapsedMs: 100, distanceM: 1, distanceAlongLapM: 1, gps: { lat: ORIGIN.lat + 0.0001, lng: ORIGIN.lng }, velocityKmh: 10, heading: 0, heightM: 100, longAccG: 0, vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0, leanAngleDeg: 0, satellites: 10 },
    ];
    const gate = makeGate(ORIGIN.lat, ORIGIN.lng);
    const crossings = detectLapCrossings(points, gate, ORIGIN);
    expect(crossings).toHaveLength(0);
  });

  it('enforces MIN_INTER_LAP_MS gap between crossings (30 s)', () => {
    // Two crossings only 5 s apart — second should be rejected
    const points: DataPoint[] = [
      { elapsedMs: 0,    distanceM: 0, distanceAlongLapM: 0, gps: { lat: ORIGIN.lat - 0.0001, lng: ORIGIN.lng }, velocityKmh: 80, heading: 0, heightM: 100, longAccG: 0, vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0, leanAngleDeg: 0, satellites: 10 },
      { elapsedMs: 100,  distanceM: 5, distanceAlongLapM: 5, gps: { lat: ORIGIN.lat + 0.0001, lng: ORIGIN.lng }, velocityKmh: 80, heading: 0, heightM: 100, longAccG: 0, vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0, leanAngleDeg: 0, satellites: 10 },
      // 5 s later (5000 ms) — too soon
      { elapsedMs: 5000, distanceM: 10, distanceAlongLapM: 10, gps: { lat: ORIGIN.lat - 0.0001, lng: ORIGIN.lng }, velocityKmh: 80, heading: 0, heightM: 100, longAccG: 0, vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0, leanAngleDeg: 0, satellites: 10 },
      { elapsedMs: 5100, distanceM: 15, distanceAlongLapM: 15, gps: { lat: ORIGIN.lat + 0.0001, lng: ORIGIN.lng }, velocityKmh: 80, heading: 0, heightM: 100, longAccG: 0, vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0, leanAngleDeg: 0, satellites: 10 },
    ];
    const gate = makeGate(ORIGIN.lat, ORIGIN.lng);
    const crossings = detectLapCrossings(points, gate, ORIGIN);
    expect(crossings).toHaveLength(1);
  });
});

describe('assembleLaps', () => {
  it('returns empty for fewer than 2 crossings', () => {
    expect(assembleLaps('s', [], [], 0)).toHaveLength(0);
    const oneCrossing = [{ pointIndex: 1, t: 0.5, elapsedMs: 1000, distanceM: 100 }];
    expect(assembleLaps('s', [], oneCrossing, 0)).toHaveLength(0);
  });

  it('produces N-1 laps for N crossings', () => {
    const pts: DataPoint[] = Array.from({ length: 50 }, (_, i) => ({
      elapsedMs: i * 1000,
      distanceM: i * 10,
      distanceAlongLapM: i * 10,
      gps: { lat: ORIGIN.lat, lng: ORIGIN.lng },
      velocityKmh: 80,
      heading: 0,
      heightM: 100,
      longAccG: 0, vertAccG: 0,
      xGyro: 0, yGyro: 0, zGyro: 0,
      leanAngleDeg: 0,
      satellites: 10,
    }));
    const crossings = [
      { pointIndex: 5,  t: 0, elapsedMs: 5000,  distanceM: 50 },
      { pointIndex: 20, t: 0, elapsedMs: 20000, distanceM: 200 },
      { pointIndex: 40, t: 0, elapsedMs: 40000, distanceM: 400 },
    ];
    const laps = assembleLaps('sess', pts, crossings, 0);
    expect(laps).toHaveLength(2);
  });

  it('lap time equals crossing-to-crossing elapsed time', () => {
    const pts: DataPoint[] = Array.from({ length: 50 }, (_, i) => ({
      elapsedMs: i * 1000,
      distanceM: i * 10,
      distanceAlongLapM: i * 10,
      gps: { lat: ORIGIN.lat, lng: ORIGIN.lng },
      velocityKmh: 80, heading: 0, heightM: 100,
      longAccG: 0, vertAccG: 0,
      xGyro: 0, yGyro: 0, zGyro: 0,
      leanAngleDeg: 0, satellites: 10,
    }));
    const crossings = [
      { pointIndex: 5,  t: 0, elapsedMs: 5000,  distanceM: 50 },
      { pointIndex: 25, t: 0, elapsedMs: 25000, distanceM: 250 },
    ];
    const [lap] = assembleLaps('sess', pts, crossings, 0);
    expect(lap.lapTimeMs).toBeCloseTo(20000, 0);
  });

  it('lap points have distanceAlongLapM starting near 0', () => {
    const pts: DataPoint[] = Array.from({ length: 50 }, (_, i) => ({
      elapsedMs: i * 1000,
      distanceM: i * 10,
      distanceAlongLapM: i * 10,
      gps: { lat: ORIGIN.lat, lng: ORIGIN.lng },
      velocityKmh: 80, heading: 0, heightM: 100,
      longAccG: 0, vertAccG: 0,
      xGyro: 0, yGyro: 0, zGyro: 0,
      leanAngleDeg: 0, satellites: 10,
    }));
    const crossings = [
      { pointIndex: 10, t: 0, elapsedMs: 10000, distanceM: 100 },
      { pointIndex: 30, t: 0, elapsedMs: 30000, distanceM: 300 },
    ];
    const [lap] = assembleLaps('sess', pts, crossings, 0);
    // distanceAlongLapM = distanceM - start.distanceM
    expect(lap.points[0].distanceAlongLapM).toBeGreaterThanOrEqual(0);
    expect(lap.points[0].distanceAlongLapM).toBeLessThan(5);
  });

  it('assigns sequential lap numbers starting at 1', () => {
    const pts: DataPoint[] = Array.from({ length: 60 }, (_, i) => ({
      elapsedMs: i * 1000, distanceM: i * 10, distanceAlongLapM: i * 10,
      gps: { lat: ORIGIN.lat, lng: ORIGIN.lng },
      velocityKmh: 80, heading: 0, heightM: 100,
      longAccG: 0, vertAccG: 0, xGyro: 0, yGyro: 0, zGyro: 0,
      leanAngleDeg: 0, satellites: 10,
    }));
    const crossings = [
      { pointIndex: 5,  t: 0, elapsedMs: 5000,  distanceM: 50 },
      { pointIndex: 20, t: 0, elapsedMs: 20000, distanceM: 200 },
      { pointIndex: 40, t: 0, elapsedMs: 40000, distanceM: 400 },
    ];
    const laps = assembleLaps('sess', pts, crossings, 0);
    expect(laps[0].lapNumber).toBe(1);
    expect(laps[1].lapNumber).toBe(2);
  });
});
