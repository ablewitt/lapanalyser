import { forwardRef } from 'react';
import { useCombinedLaps } from '../../hooks/useCombinedLaps';
import { useSessionsStore } from '../../store/sessions';
import { useSectorsStore } from '../../store/sectors';
import { useSpeedTrapsStore } from '../../store/speedTraps';
import { useSessionCircuit } from '../../hooks/useSessionCircuit';
import TrackMap from './TrackMap';
import type { TrackMapHandle } from './TrackMap';

interface Props {
  addingSector?: boolean;
  onSectorClick?: (lat: number, lng: number) => void;
  addingSpeedTrap?: boolean;
  onSpeedTrapClick?: (lat: number, lng: number) => void;
  visibilityControls?: boolean;
}

const AppMap = forwardRef<TrackMapHandle, Props>(function AppMap(
  { addingSector = false, onSectorClick, addingSpeedTrap = false, onSpeedTrapClick, visibilityControls = false },
  ref,
) {
  const selectedLaps = useCombinedLaps();
  const firstSession = useSessionsStore(s => s.sessions[0] ?? null);
  const { points: circuitOutline } = useSessionCircuit(firstSession);
  const boundaries = useSectorsStore(s => s.boundaries);
  const traps = useSpeedTrapsStore(s => s.traps);

  return (
    <TrackMap
      ref={ref}
      selectedLaps={selectedLaps}
      circuitOutline={circuitOutline}
      sectorBoundaries={boundaries}
      addingSector={addingSector}
      onSectorClick={onSectorClick ?? (() => {})}
      speedTraps={traps}
      addingSpeedTrap={addingSpeedTrap}
      onSpeedTrapClick={onSpeedTrapClick ?? (() => {})}
      showVisibilityControls={visibilityControls}
    />
  );
});

export default AppMap;
