import { supabase } from './supabase';

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
}

export async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', userId)
    .single();
  return data ?? null;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .ilike('username', username);
  if (error) return true;
  return (count ?? 0) === 0;
}

export async function updateUsername(userId: string, username: string): Promise<string | null> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, username })
    .eq('id', userId);
  return error?.message ?? null;
}
