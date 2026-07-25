import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ComparisonMode = 'distance' | 'time';

interface SelectionState {
  selectedLapIds: string[];
  referenceLapId: string | null;
  groupA: string[];
  groupB: string[];
  comparisonMode: ComparisonMode;
  toggleLap: (lapId: string) => void;
  setReferenceLapId: (lapId: string | null) => void;
  setGroupA: (lapIds: string[]) => void;
  setGroupB: (lapIds: string[]) => void;
  setComparisonMode: (mode: ComparisonMode) => void;
  clearAll: () => void;
}

export const useSelectionStore = create<SelectionState>()(
  persist(
    (set) => ({
      selectedLapIds: [],
      referenceLapId: null,
      groupA: [],
      groupB: [],
      comparisonMode: 'distance',

      toggleLap: (lapId) => set((state) => {
        const already = state.selectedLapIds.includes(lapId);
        return {
          selectedLapIds: already
            ? state.selectedLapIds.filter(id => id !== lapId)
            : [...state.selectedLapIds, lapId],
          referenceLapId: already && state.referenceLapId === lapId ? null : state.referenceLapId,
        };
      }),

      setReferenceLapId: (lapId) => set({ referenceLapId: lapId }),
      setGroupA: (lapIds) => set({ groupA: lapIds }),
      setGroupB: (lapIds) => set({ groupB: lapIds }),
      setComparisonMode: (mode) => set({ comparisonMode: mode }),
      clearAll: () => set({ selectedLapIds: [], referenceLapId: null, groupA: [], groupB: [] }),
    }),
    {
      name: 'la_selection',
      // sessionStorage keeps selection isolated per tab, matching the per-tab
      // active-session list (see saveActiveSessionIds). localStorage would let
      // multiple tabs clobber each other's selection.
      storage: createJSONStorage(() => sessionStorage),
      // Persist only serializable selection state, not the action functions.
      partialize: (state) => ({
        selectedLapIds: state.selectedLapIds,
        referenceLapId: state.referenceLapId,
        groupA: state.groupA,
        groupB: state.groupB,
        comparisonMode: state.comparisonMode,
      }),
    },
  ),
);
