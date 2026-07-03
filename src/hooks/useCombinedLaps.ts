import { useMemo } from 'react';
import { useSelectionStore } from '../store/selection';
import { useSelectedLaps } from './useSelectedLaps';
import { useGroupMeanLaps } from './useGroupMeanLaps';
import type { SelectedLap } from './useSelectedLaps';

export function useCombinedLaps(): SelectedLap[] {
  const realLaps = useSelectedLaps();
  const groupLaps = useGroupMeanLaps();
  const referenceLapId = useSelectionStore(s => s.referenceLapId);

  return useMemo(() => {
    const combined = [...realLaps, ...groupLaps];
    // useSelectedLaps already puts the real reference lap at index 0.
    // If the reference is a group mean (not in realLaps), move it to index 0
    // so buildDistanceGrid uses it as the baseline for timeDeltaS.
    const realRefHandled = realLaps.some(s => s.lap.id === referenceLapId);
    if (referenceLapId && !realRefHandled) {
      const refIdx = combined.findIndex(s => s.lap.id === referenceLapId);
      if (refIdx > 0) {
        const [ref] = combined.splice(refIdx, 1);
        combined.unshift(ref);
      }
    }
    return combined;
  }, [realLaps, groupLaps, referenceLapId]);
}
