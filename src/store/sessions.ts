import { create } from 'zustand';
import type { Session } from '../domain/models';

interface SessionsState {
  sessions: Session[];
  circuitOverrides: Record<string, string | null>;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;
  renameSession: (id: string, displayName: string | null) => void;
  setCircuitOverride: (sessionId: string, path: string | null | undefined) => void;
}

export const useSessionsStore = create<SessionsState>((set) => ({
  sessions: [],
  circuitOverrides: {},

  addSession: (session) => set((state) => {
    if (state.sessions.some(s => s.id === session.id)) return state;
    return { sessions: [...state.sessions, session] };
  }),

  renameSession: (id, displayName) => set((state) => ({
    sessions: state.sessions.map(s => s.id === id ? { ...s, displayName } : s),
  })),

  removeSession: (id) => set((state) => {
    const overrides = { ...state.circuitOverrides };
    delete overrides[id];
    return { sessions: state.sessions.filter(s => s.id !== id), circuitOverrides: overrides };
  }),

  setCircuitOverride: (sessionId, path) => set((state) => {
    const overrides = { ...state.circuitOverrides };
    if (path === undefined) delete overrides[sessionId];
    else overrides[sessionId] = path;
    return { circuitOverrides: overrides };
  }),
}));
