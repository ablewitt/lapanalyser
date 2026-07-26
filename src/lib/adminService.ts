import { supabase } from './supabase';

// ── Admin-only data access ────────────────────────────────────
// Reads rely on RLS admin-bypass policies (see is_admin()). Privileged
// actions that RLS can't express (touching auth.users, changing roles)
// go through SECURITY DEFINER RPCs guarded by is_admin(), added in later
// phases. This module stays a flat set of async fns like the other
// *Service.ts files.

export interface AdminOverview {
  userCount: number;
  sessionCount: number;
  trackConfigCount: number;
  publicSessionCount: number;
}

/**
 * Headline counts for the admin dashboard. Uses count-only (head) queries so
 * no row data crosses the wire. Requires the caller to be an admin — the
 * counts respect RLS, which grants admins full visibility via is_admin().
 */
export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [users, sessions, configs, publicSessions] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('sessions').select('id', { count: 'exact', head: true }),
    supabase.from('track_configs').select('id', { count: 'exact', head: true }),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('is_public', true),
  ]);

  return {
    userCount: users.count ?? 0,
    sessionCount: sessions.count ?? 0,
    trackConfigCount: configs.count ?? 0,
    publicSessionCount: publicSessions.count ?? 0,
  };
}
