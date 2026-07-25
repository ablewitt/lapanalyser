import { supabase } from './supabase';

export interface ShareTarget {
  userId: string;
  username: string | null;
}

export async function lookupUser(query: string): Promise<ShareTarget | null> {
  const { data, error } = await supabase.rpc('lookup_user', { query: query.trim() });
  if (error || !data || (data as { id: string; username: string | null }[]).length === 0) return null;
  const row = (data as { id: string; username: string | null }[])[0];
  return { userId: row.id, username: row.username };
}

// ── Sessions ──────────────────────────────────────────────────

export async function getSessionShares(sessionId: string): Promise<ShareTarget[]> {
  const { data, error } = await supabase
    .from('session_shares')
    .select('shared_with_user_id')
    .eq('session_id', sessionId);
  if (error || !data || data.length === 0) return [];

  const ids = data.map(r => r.shared_with_user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', ids);

  return ids.map(uid => ({
    userId: uid,
    username: profiles?.find(p => p.id === uid)?.username ?? null,
  }));
}

export async function shareSession(sessionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('session_shares')
    .insert({ session_id: sessionId, shared_with_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function unshareSession(sessionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('session_shares')
    .delete()
    .eq('session_id', sessionId)
    .eq('shared_with_user_id', userId);
  if (error) throw new Error(error.message);
}

export async function setSessionPublic(sessionId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ is_public: isPublic })
    .eq('id', sessionId);
  if (error) throw new Error(error.message);
}

// ── Track configs ─────────────────────────────────────────────

export async function getTrackConfigShares(configId: string): Promise<ShareTarget[]> {
  const { data, error } = await supabase
    .from('track_config_shares')
    .select('shared_with_user_id')
    .eq('config_id', configId);
  if (error || !data || data.length === 0) return [];

  const ids = data.map(r => r.shared_with_user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', ids);

  return ids.map(uid => ({
    userId: uid,
    username: profiles?.find(p => p.id === uid)?.username ?? null,
  }));
}

export async function shareTrackConfig(configId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('track_config_shares')
    .insert({ config_id: configId, shared_with_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function unshareTrackConfig(configId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('track_config_shares')
    .delete()
    .eq('config_id', configId)
    .eq('shared_with_user_id', userId);
  if (error) throw new Error(error.message);
}

export async function setTrackConfigPublic(configId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from('track_configs')
    .update({ is_public: isPublic })
    .eq('id', configId);
  if (error) throw new Error(error.message);
}
