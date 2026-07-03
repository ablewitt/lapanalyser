import { create } from 'zustand';

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

export const useSelectionStore = create<SelectionState>((set) => ({
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
}));
