import { create } from 'zustand';

export type ActiveTab = 'chart' | 'map' | 'table';

interface UiState {
  activeTab: ActiveTab;
  cursorDistanceM: number | null;
  cursorElapsedMs: number | null;
  parseWarnings: string[];
  isLoading: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  setCursor: (distanceM: number | null, elapsedMs: number | null) => void;
  setParseWarnings: (warnings: string[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'chart',
  cursorDistanceM: null,
  cursorElapsedMs: null,
  parseWarnings: [],
  isLoading: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCursor: (distanceM, elapsedMs) => set({ cursorDistanceM: distanceM, cursorElapsedMs: elapsedMs }),
  setParseWarnings: (warnings) => set({ parseWarnings: warnings }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
