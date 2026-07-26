import { supabase } from './supabase';
import type { Database } from './database.types';
import { fetchOwnerUsernames, type DbSessionRow } from './sessionService';

export type AdminUser = Database['public']['Functions']['admin_list_users']['Returns'][number];

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

// ── User management ───────────────────────────────────────────

export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setUserRole(targetId: string, role: 'user' | 'admin'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_role', { target_id: targetId, new_role: role });
  if (error) throw new Error(error.message);
}

export async function deleteUser(targetId: string): Promise<void> {
  // Collect the user's session file paths first (their session rows cascade
  // away with the account). Then delete the account, then remove the files via
  // the Storage API — direct SQL deletes on storage tables are blocked, and
  // admin RLS bypass permits the API removal.
  const { data: sessions } = await supabase
    .from('sessions')
    .select('storage_path')
    .eq('user_id', targetId);
  const paths = (sessions ?? []).map(s => s.storage_path).filter(Boolean);

  const { error } = await supabase.rpc('admin_delete_user', { target_id: targetId });
  if (error) throw new Error(error.message);

  if (paths.length) await supabase.storage.from('session-files').remove(paths);
}

// ── Session management ────────────────────────────────────────

export interface AdminSession {
  row: DbSessionRow;
  ownerName: string | null;
}

/** All sessions (admin RLS bypass) with owner usernames resolved. */
export async function listAllSessions(): Promise<AdminSession[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const names = await fetchOwnerUsernames([...new Set(rows.map(r => r.user_id))]);
  return rows.map(row => ({ row, ownerName: names[row.user_id] ?? null }));
}

export async function setSessionPublic(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from('sessions').update({ is_public: isPublic }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Audit log ─────────────────────────────────────────────────

export type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];

export interface AuditFilters {
  from?: string;      // ISO date (inclusive lower bound)
  to?: string;        // ISO date (inclusive upper bound)
  actorId?: string;
  action?: string;
}

/** Known audit actions, for the filter dropdown and friendly labels. */
export const AUDIT_ACTIONS = [
  'user.signup', 'user.role_change', 'user.delete',
  'session.create', 'session.delete', 'session.visibility',
  'session.share.add', 'session.share.remove',
  'ticket.create', 'ticket.message', 'ticket.status',
] as const;

function applyAuditFilters<T>(query: T, filters: AuditFilters): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  if (filters.from) q = q.gte('created_at', filters.from);
  if (filters.to) q = q.lte('created_at', filters.to);
  if (filters.actorId) q = q.eq('actor_id', filters.actorId);
  if (filters.action) q = q.eq('action', filters.action);
  return q as T;
}

export async function fetchAuditLog(filters: AuditFilters, limit: number, offset: number): Promise<AuditLogRow[]> {
  const base = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  const { data, error } = await applyAuditFilters(base, filters);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Fetch every row matching the filters, paged, for CSV export. Capped to keep memory sane. */
export async function fetchAllAuditRows(filters: AuditFilters, cap = 50000): Promise<AuditLogRow[]> {
  const page = 1000;
  const all: AuditLogRow[] = [];
  for (let offset = 0; offset < cap; offset += page) {
    const rows = await fetchAuditLog(filters, page, offset);
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}
