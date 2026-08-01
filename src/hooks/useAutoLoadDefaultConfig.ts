import { useEffect, useRef } from 'react';
import { fetchTrackConfigsForCircuit } from '../lib/trackConfigService';
import { useSectorsStore } from '../store/sectors';
import { useSpeedTrapsStore } from '../store/speedTraps';

/**
 * Applies a circuit's default track config (sectors + speed traps) the first
 * time that circuit is detected, so "default" actually shows on the map without
 * a manual Load. Runs once per circuit and skips when the user already has
 * sectors/traps placed, so it never clobbers in-progress edits. If a circuit has
 * no default config, nothing happens.
 */
export function useAutoLoadDefaultConfig(circuitName: string | null | undefined) {
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!circuitName || loadedFor.current === circuitName) return;
    let cancelled = false;

    fetchTrackConfigsForCircuit(circuitName)
      .then(configs => {
        if (cancelled) return;
        const def = configs.find(c => c.is_default);
        if (!def) return;

        const sectors = useSectorsStore.getState();
        const traps = useSpeedTrapsStore.getState();
        if (sectors.boundaries.length > 0 || traps.traps.length > 0) return;

        loadedFor.current = circuitName;
        def.sectors.forEach(sectors.addBoundary);
        def.traps.forEach(traps.addTrap);
      })
      .catch(() => { /* non-fatal: default just won't auto-load */ });

    return () => { cancelled = true; };
  }, [circuitName]);
}
