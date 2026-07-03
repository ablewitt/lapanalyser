import { useState, useEffect, useMemo } from 'react';
import type { Session, GpsCoord } from '../domain/models';
import { useCircuitIndex } from './useCircuitIndex';
import { useSessionsStore } from '../store/sessions';
import { detectCircuit, type CircuitEntry } from '../domain/circuitDetection';
import { parseCirFile } from '../parsers/cir';

export interface SessionCircuit {
  detected: CircuitEntry | null;
  active: CircuitEntry | null;
  points: GpsCoord[] | null;
  nearbyCircuits: CircuitEntry[];
  setOverride: (path: string | null | undefined) => void;
}

export function useSessionCircuit(session: Session | null): SessionCircuit {
  const index = useCircuitIndex();
  const overrides = useSessionsStore(s => s.circuitOverrides);
  const setCircuitOverride = useSessionsStore(s => s.setCircuitOverride);
  const [points, setPoints] = useState<GpsCoord[] | null>(null);

  const sessionPoints = useMemo<GpsCoord[]>(() => {
    if (!session) return [];
    return session.laps.flatMap(l => l.points.map(p => p.gps));
  }, [session?.id]);

  const detected = useMemo<CircuitEntry | null>(() => {
    if (!index || sessionPoints.length === 0) return null;
    return detectCircuit(sessionPoints, index);
  }, [index, session?.id, sessionPoints.length]);

  const override = session ? overrides[session.id] : undefined;
  const active = useMemo<CircuitEntry | null>(() => {
    if (!index) return null;
    if (override === null) return null;
    if (typeof override === 'string') return index.find(e => e.path === override) ?? null;
    return detected;
  }, [index, override, detected]);

  // Nearby circuits for the override picker (same country, within 50 km of centroid)
  const nearbyCircuits = useMemo<CircuitEntry[]>(() => {
    if (!index || !detected) return index ?? [];
    return index
      .filter(e => e.country === detected.country)
      .sort((a, b) => {
        const da = Math.hypot(a.centLat - detected.centLat, a.centLng - detected.centLng);
        const db = Math.hypot(b.centLat - detected.centLat, b.centLng - detected.centLng);
        return da - db;
      });
  }, [index, detected]);

  useEffect(() => {
    if (!active) { setPoints(null); return; }
    let cancelled = false;
    fetch(active.path)
      .then(r => r.text())
      .then(text => { if (!cancelled) setPoints(parseCirFile(text)); })
      .catch(() => { if (!cancelled) setPoints(null); });
    return () => { cancelled = true; };
  }, [active?.path]);

  return {
    detected,
    active,
    points,
    nearbyCircuits,
    setOverride: (path) => session && setCircuitOverride(session.id, path),
  };
}
