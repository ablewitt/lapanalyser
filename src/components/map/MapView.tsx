import { useState, useCallback } from 'react';
import styles from './MapView.module.css';
import { useCombinedLaps } from '../../hooks/useCombinedLaps';
import { useSessionsStore } from '../../store/sessions';
import { useSectorsStore } from '../../store/sectors';
import { useSpeedTrapsStore } from '../../store/speedTraps';
import { nearestTrackPoint } from '../../domain/sectors';
import AppMap from './AppMap';

export default function MapView() {
  const selectedLaps = useCombinedLaps();
  const allSessions = useSessionsStore(s => s.sessions);
  const boundaries = useSectorsStore(s => s.boundaries);
  const addBoundary = useSectorsStore(s => s.addBoundary);
  const clearBoundaries = useSectorsStore(s => s.clearBoundaries);
  const traps = useSpeedTrapsStore(s => s.traps);
  const addTrap = useSpeedTrapsStore(s => s.addTrap);
  const clearTraps = useSpeedTrapsStore(s => s.clearTraps);

  const [addingSector, setAddingSector] = useState(false);
  const [addingSpeedTrap, setAddingSpeedTrap] = useState(false);

  const getTrackPoints = useCallback(() =>
    selectedLaps[0]?.lap.points ?? allSessions.flatMap(s => s.laps)[0]?.points,
    [selectedLaps, allSessions],
  );

  const handleSectorClick = useCallback((lat: number, lng: number) => {
    const points = getTrackPoints();
    if (!points) return;
    const pt = nearestTrackPoint(lat, lng, points);
    addBoundary({
      id: crypto.randomUUID(),
      distanceAlongLapM: pt.distanceAlongLapM,
      gps: pt.gps,
      heading: pt.heading,
    });
  }, [getTrackPoints, addBoundary]);

  const handleSpeedTrapClick = useCallback((lat: number, lng: number) => {
    const points = getTrackPoints();
    if (!points) return;
    const pt = nearestTrackPoint(lat, lng, points);
    addTrap({
      id: crypto.randomUUID(),
      distanceAlongLapM: pt.distanceAlongLapM,
      gps: pt.gps,
      heading: pt.heading,
    });
  }, [getTrackPoints, addTrap]);

  const toggleSector = useCallback(() => {
    setAddingSector(v => !v);
    setAddingSpeedTrap(false);
  }, []);

  const toggleSpeedTrap = useCallback(() => {
    setAddingSpeedTrap(v => !v);
    setAddingSector(false);
  }, []);

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
          onClick={toggleSector}
          title="Click near the track to place a sector boundary"
        >
          + Sector
        </button>
        {boundaries.length > 0 && (
          <button onClick={clearBoundaries}>Clear Sectors</button>
        )}
        <button
          className={addingSpeedTrap ? 'active' : ''}
          onClick={toggleSpeedTrap}
          title="Click near the track to place a speed trap"
        >
          + Speed Trap
        </button>
        {traps.length > 0 && (
          <button onClick={clearTraps}>Clear Traps</button>
        )}
      </div>
      <div style={{ flex: '1 1 0', minHeight: 0 }}>
        <AppMap
          addingSector={addingSector}
          onSectorClick={handleSectorClick}
          addingSpeedTrap={addingSpeedTrap}
          onSpeedTrapClick={handleSpeedTrapClick}
        />
      </div>
    </div>
  );
}
