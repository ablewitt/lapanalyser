import { create } from 'zustand';
import type { SpeedTrap } from '../domain/models';

interface SpeedTrapsState {
  traps: SpeedTrap[];
  addTrap: (trap: SpeedTrap) => void;
  removeTrap: (id: string) => void;
  clearTraps: () => void;
}

export const useSpeedTrapsStore = create<SpeedTrapsState>((set) => ({
  traps: [],
  addTrap: (trap) => set((state) => ({ traps: [...state.traps, trap] })),
  removeTrap: (id) => set((state) => ({ traps: state.traps.filter(t => t.id !== id) })),
  clearTraps: () => set({ traps: [] }),
}));
