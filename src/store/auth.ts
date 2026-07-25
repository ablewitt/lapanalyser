import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { loadProfile } from '../lib/profileService';
import type { ProfileRow } from '../lib/profileService';

interface AuthState {
  user: User | null;
  profile: ProfileRow | null;
  session: Session | null;
  isInitializing: boolean;
  isLoadingProfile: boolean;
  setProfile: (profile: ProfileRow | null) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  profile: null,
  session: null,
  isInitializing: true,
  isLoadingProfile: false,

  setProfile: (profile) => set({ profile }),

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signUp: async (email, password, username) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return error?.message ?? null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session?.user) {
    useAuthStore.setState({ user: null, session: null, profile: null, isInitializing: false, isLoadingProfile: false });
    return;
  }
  useAuthStore.setState({ user: session.user, session, isLoadingProfile: true });
  loadProfile(session.user.id).then(profile => {
    useAuthStore.setState({ profile, isInitializing: false, isLoadingProfile: false });
  });
});
