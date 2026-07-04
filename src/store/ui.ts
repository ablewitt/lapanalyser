import { create } from 'zustand';

export type ActiveTab = 'chart' | 'map' | 'table';
export type TableSubTab = 'summary' | 'events' | 'sectors' | 'speed-traps';
export type HeatChannel = 'off' | 'velocityKmh' | 'longAccG' | 'leanAngleDeg';
export type BaseMapLayer = 'osm' | 'satellite' | 'dark' | 'off';

interface UiState {
  activeTab: ActiveTab;
  cursorDistanceM: number | null;
  cursorElapsedMs: number | null;
  parseWarnings: string[];
  isLoading: boolean;
  mapBaseLayer: BaseMapLayer;
  mapHeatChannel: HeatChannel;
  chartZoomDomain: [number, number] | null;
  tableSubTab: TableSubTab;
  mapShowSectors: boolean;
  mapShowEvents: boolean;
  mapShowTraps: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  setTableSubTab: (tab: TableSubTab) => void;
  setCursor: (distanceM: number | null, elapsedMs: number | null) => void;
  setParseWarnings: (warnings: string[]) => void;
  setLoading: (loading: boolean) => void;
  setMapBaseLayer: (layer: BaseMapLayer) => void;
  setMapHeatChannel: (channel: HeatChannel) => void;
  setChartZoomDomain: (domain: [number, number] | null) => void;
  setMapShowSectors: (v: boolean) => void;
  setMapShowEvents: (v: boolean) => void;
  setMapShowTraps: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'chart',
  cursorDistanceM: null,
  cursorElapsedMs: null,
  parseWarnings: [],
  isLoading: false,
  mapBaseLayer: 'satellite',
  mapHeatChannel: 'velocityKmh',
  chartZoomDomain: null,
  tableSubTab: 'summary',
  mapShowSectors: true,
  mapShowEvents: true,
  mapShowTraps: true,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTableSubTab: (tab) => set({ tableSubTab: tab }),
  setCursor: (distanceM, elapsedMs) => set({ cursorDistanceM: distanceM, cursorElapsedMs: elapsedMs }),
  setParseWarnings: (warnings) => set({ parseWarnings: warnings }),
  setLoading: (loading) => set({ isLoading: loading }),
  setMapBaseLayer: (layer) => set({ mapBaseLayer: layer }),
  setMapHeatChannel: (channel) => set({ mapHeatChannel: channel }),
  setChartZoomDomain: (domain) => set({ chartZoomDomain: domain }),
  setMapShowSectors: (v) => set({ mapShowSectors: v }),
  setMapShowEvents: (v) => set({ mapShowEvents: v }),
  setMapShowTraps: (v) => set({ mapShowTraps: v }),
}));
