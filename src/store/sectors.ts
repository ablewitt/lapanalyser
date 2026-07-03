import { create } from 'zustand';
import type { SectorBoundary } from '../domain/models';

interface SectorsState {
  boundaries: SectorBoundary[];
  addBoundary: (b: SectorBoundary) => void;
  removeBoundary: (id: string) => void;
  clearBoundaries: () => void;
}

export const useSectorsStore = create<SectorsState>((set) => ({
  boundaries: [],
  addBoundary: (b) => set((state) => ({ boundaries: [...state.boundaries, b] })),
  removeBoundary: (id) => set((state) => ({ boundaries: state.boundaries.filter(b => b.id !== id) })),
  clearBoundaries: () => set({ boundaries: [] }),
}));
