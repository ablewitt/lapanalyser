import { supabase } from './supabase';
import type { Database } from './database.types';
import type { Session, GpsCoord } from '../domain/models';
import { detectCircuit, type CircuitEntry } from '../domain/circuitDetection';

// ── Circuit detection (non-hook, async) ───────────────────────

let circuitIndexCache: CircuitEntry[] | null = null;

async function loadCircuitIndex(): Promise<CircuitEntry[]> {
  if (circuitIndexCache) return circuitIndexCache;
  const res = await fetch('/circuit-index.json');
  circuitIndexCache = await res.json() as CircuitEntry[];
  return circuitIndexCache;
}

export async function detectCircuitName(gpsPoints: GpsCoord[]): Promise<string | null> {
  const index = await loadCircuitIndex();
  return detectCircuit(gpsPoints, index)?.name ?? null;
}

export type DbSessionRow = Database['public']['Tables']['sessions']['Row'];

// ── ID re-keying ──────────────────────────────────────────────

export function rekeySession(session: Session, dbId: string): Session {
  return {
    ...session,
    id: dbId,
    laps: session.laps.map(lap => ({
      ...lap,
      sessionId: dbId,
      id: `${dbId}-${lap.lapNumber}`,
    })),
  };
}

// ── Active session persistence (sessionStorage) ───────────────
// Uses sessionStorage, not localStorage, so each browser tab keeps its own
// active-session set. localStorage is shared across all tabs of an origin, so
// multiple tabs would clobber each other's list. sessionStorage survives a
// page refresh but is isolated per tab, which is exactly the semantics we want.

const activeKey = (userId: string) => `la_active:${userId}`;
const MAX_ACTIVE = 10;

export function saveActiveSessionIds(userId: string, ids: string[]): void {
  sessionStorage.setItem(activeKey(userId), JSON.stringify(ids.slice(0, MAX_ACTIVE)));
}

export function loadActiveSessionIds(userId: string): string[] {
  try {
    const raw = sessionStorage.getItem(activeKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// One-time migration: persistence moved from localStorage to sessionStorage
// (per-tab, multi-tab safe). Remove the now-orphaned localStorage keys so they
// don't sit around confusing future debugging. Safe to run on every startup.
export function clearOrphanedPersistedState(): void {
  try {
    // Collect first, then remove — removing while iterating by index shifts keys.
    const orphans: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === 'la_selection' || key.startsWith('la_active:'))) orphans.push(key);
    }
    for (const key of orphans) localStorage.removeItem(key);
  } catch {
    // Ignore — a missing/blocked localStorage just means nothing to clean up.
  }
}

// Keep only saved ids that are still accessible to the user. `accessibleIds`
// come from fetchSessionsByIds, which respects RLS — so an id that was saved
// but isn't returned has been deleted, unshared, or made private again, and
// should be pruned so it can't linger and fail on every future refresh.
// Order is preserved.
export function pruneInaccessibleIds(savedIds: string[], accessibleIds: Iterable<string>): string[] {
  const accessible = new Set(accessibleIds);
  return savedIds.filter(id => accessible.has(id));
}

// ── Supabase operations ───────────────────────────────────────

export async function uploadSessionFile(file: File, storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from('session-files').upload(storagePath, file);
  if (error) throw new Error(`Upload failed: ${error.message}`);
}

export async function saveSessionRecord(
  dbId: string,
  userId: string,
  filename: string,
  venue: string,
  dateRecorded: Date,
  storagePath: string,
  lapCount: number,
  bestLapTimeMs: number | null,
  circuitName: string | null,
): Promise<DbSessionRow> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      id: dbId,
      user_id: userId,
      filename,
      venue_raw: venue,
      date_recorded: dateRecorded.toISOString(),
      storage_path: storagePath,
      lap_count: lapCount,
      best_lap_time_ms: bestLapTimeMs,
      circuit_name: circuitName,
      is_public: false,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from('session-files').remove([storagePath]);
    throw new Error(`Save failed: ${error.message}`);
  }
  return data;
}

export async function fetchSessionsWithPrivateShares(sessionIds: string[]): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set();
  const { data } = await supabase
    .from('session_shares')
    .select('session_id')
    .in('session_id', sessionIds);
  return new Set((data ?? []).map(r => r.session_id));
}

export async function fetchOwnerUsernames(userIds: string[]): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);
  return Object.fromEntries((data ?? []).map(p => [p.id, p.username ?? null]));
}

export async function fetchUserSessions(): Promise<DbSessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Sessions belonging to a specific user. For admins (RLS bypass) this returns
 *  the owner's sessions even when they aren't the caller. */
export async function fetchSessionsForUser(userId: string): Promise<DbSessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchSessionsByIds(ids: string[]): Promise<DbSessionRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .in('id', ids);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function downloadSessionContent(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('session-files').download(storagePath);
  if (error) throw new Error(`Download failed: ${error.message}`);
  return data.text();
}

export async function updateSessionMeta(
  id: string,
  lapCount: number,
  bestLapTimeMs: number | null,
  circuitName: string | null,
): Promise<void> {
  await supabase
    .from('sessions')
    .update({ lap_count: lapCount, best_lap_time_ms: bestLapTimeMs, circuit_name: circuitName })
    .eq('id', id);
  // Silently ignore errors — this is a best-effort backfill
}

export async function renameSession(id: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ display_name: displayName.trim() || null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSession(id: string, storagePath: string): Promise<void> {
  const { error: dbError } = await supabase.from('sessions').delete().eq('id', id);
  if (dbError) throw new Error(dbError.message);
  await supabase.storage.from('session-files').remove([storagePath]);
}
