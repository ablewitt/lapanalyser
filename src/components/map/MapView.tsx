import { useState, useCallback } from 'react';
import styles from './MapView.module.css';
import { useCombinedLaps } from '../../hooks/useCombinedLaps';
import { useSessionsStore } from '../../store/sessions';
import { useSectorsStore } from '../../store/sectors';
import { useSessionCircuit } from '../../hooks/useSessionCircuit';
import { nearestTrackPoint } from '../../domain/sectors';
import TrackMap from './TrackMap';

export default function MapView() {
  const selectedLaps = useCombinedLaps();
  const firstSession = useSessionsStore(s => s.sessions[0] ?? null);
  const { points: circuitOutline } = useSessionCircuit(firstSession);

  const boundaries = useSectorsStore(s => s.boundaries);
  const addBoundary = useSectorsStore(s => s.addBoundary);
  const clearBoundaries = useSectorsStore(s => s.clearBoundaries);

  const [addingSector, setAddingSector] = useState(false);

  const allSessions = useSessionsStore(s => s.sessions);

  const handleSectorClick = useCallback((lat: number, lng: number) => {
    const points = selectedLaps[0]?.lap.points ?? allSessions.flatMap(s => s.laps)[0]?.points;
    if (!points) return;
    const pt = nearestTrackPoint(lat, lng, points);
    addBoundary({
      id: crypto.randomUUID(),
      distanceAlongLapM: pt.distanceAlongLapM,
      gps: pt.gps,
      heading: pt.heading,
    });
  }, [selectedLaps, allSessions, addBoundary]);

  if (selectedLaps.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Select laps from the sidebar to view the track map</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sectorToolbar}>
        <button
          className={addingSector ? 'active' : ''}
          onClick={() => setAddingSector(v => !v)}
          title="Click near the track to place a sector boundary"
        >
          + Sector
        </button>
        {boundaries.length > 0 && (
          <button onClick={clearBoundaries}>Clear Sectors</button>
        )}
      </div>
      <div style={{ flex: '1 1 0', minHeight: 0 }}>
        <TrackMap
          selectedLaps={selectedLaps}
          circuitOutline={circuitOutline}
          sectorBoundaries={boundaries}
          addingSector={addingSector}
          onSectorClick={handleSectorClick}
        />
      </div>
    </div>
  );
}
