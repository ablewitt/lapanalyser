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
  const prev = useAuthStore.getState();

  if (!session?.user) {
    useAuthStore.setState({ user: null, session: null, profile: null, isInitializing: false, isLoadingProfile: false });
    return;
  }

  // Token refreshes fire on tab focus/interval. For the same user we already
  // have a profile for, just refresh the session token silently — toggling
  // isLoadingProfile here would flip the route to <Loading/> and unmount the
  // current view (open modals, admin pages, in-app state).
  if (prev.user?.id === session.user.id && prev.profile) {
    useAuthStore.setState({ user: session.user, session });
    return;
  }

  useAuthStore.setState({ user: session.user, session, isLoadingProfile: true });
  loadProfile(session.user.id).then(profile => {
    useAuthStore.setState({ profile, isInitializing: false, isLoadingProfile: false });
  });
});
