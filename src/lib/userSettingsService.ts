import { supabase } from './supabase';

export interface UserSettingsPayload {
  map_base: string;
  show_heatmap: boolean;
  heat_channel: string;
  show_sectors: boolean;
  show_events: boolean;
  show_traps: boolean;
}

export async function loadUserSettings(): Promise<UserSettingsPayload | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('map_base, show_heatmap, heat_channel, show_sectors, show_events, show_traps')
    .single();
  if (error) return null;
  return data as UserSettingsPayload;
}

export async function saveUserSettings(userId: string, payload: Partial<UserSettingsPayload>): Promise<void> {
  await supabase.from('user_settings').update(payload).eq('user_id', userId);
}
