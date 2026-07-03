import { useMemo } from 'react';
import { useSessionsStore } from '../store/sessions';
import { useSelectionStore } from '../store/selection';
import type { Lap } from '../domain/models';
import { lapColor } from '../utils/colors';

export interface SelectedLap {
  lap: Lap;
  color: string;
  colorIndex: number;
  dashed?: boolean;
  label?: string;
  sessionLabel?: string;
}

export function useSelectedLaps(): SelectedLap[] {
  const sessions = useSessionsStore(s => s.sessions);
  const selectedLapIds = useSelectionStore(s => s.selectedLapIds);
  const referenceLapId = useSelectionStore(s => s.referenceLapId);

  return useMemo(() => {
    const allLaps = sessions.flatMap(s => s.laps);
    const laps = selectedLapIds
      .map((id, idx) => {
        const lap = allLaps.find(l => l.id === id);
        return lap ? { lap, color: lapColor(idx + 2), colorIndex: idx + 2 } : null;
      })
      .filter((x): x is SelectedLap => x !== null);

    // Move the pinned reference lap to index 0 without changing color assignments
    if (referenceLapId) {
      const refIdx = laps.findIndex(l => l.lap.id === referenceLapId);
      if (refIdx > 0) {
        const [ref] = laps.splice(refIdx, 1);
        laps.unshift(ref);
      }
    }

    return laps;
  }, [sessions, selectedLapIds, referenceLapId]);
}
