import { supabase } from './supabase';
import type { SectorBoundary, SpeedTrap } from '../domain/models';

export interface TrackConfig {
  id: string;
  trackId: string;
  name: string;
  is_default: boolean;
  is_public: boolean;
  sectors: SectorBoundary[];
  traps: SpeedTrap[];
}

export async function findOrCreateTrack(circuitName: string): Promise<string> {
  const { data: existing } = await supabase
    .from('tracks')
    .select('id')
    .eq('name', circuitName)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('tracks')
    .insert({ name: circuitName })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function fetchTrackConfigsForCircuit(circuitName: string): Promise<TrackConfig[]> {
  const { data: track } = await supabase
    .from('tracks')
    .select('id')
    .eq('name', circuitName)
    .maybeSingle();
  if (!track) return [];

  const { data, error } = await supabase
    .from('track_configs')
    .select('id, track_id, name, is_default, is_public, sectors, traps')
    .eq('track_id', track.id)
    .order('created_at', { ascending: true });
  if (error) return [];

  return (data ?? []).map(row => ({
    id: row.id,
    trackId: row.track_id,
    name: row.name,
    is_default: row.is_default,
    is_public: row.is_public,
    sectors: (row.sectors ?? []) as unknown as SectorBoundary[],
    traps: (row.traps ?? []) as unknown as SpeedTrap[],
  }));
}

export async function saveTrackConfig(
  trackId: string,
  configName: string,
  sectors: SectorBoundary[],
  traps: SpeedTrap[],
): Promise<TrackConfig> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('track_configs')
    .insert({
      user_id: user.id,
      track_id: trackId,
      name: configName,
      is_default: false,
      is_public: false,
      sectors: sectors as unknown as import('./database.types').Json,
      traps: traps as unknown as import('./database.types').Json,
    })
    .select('id, track_id, name, is_default, is_public, sectors, traps')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    trackId: data.track_id,
    name: data.name,
    is_default: data.is_default,
    is_public: data.is_public,
    sectors: (data.sectors ?? []) as unknown as SectorBoundary[],
    traps: (data.traps ?? []) as unknown as SpeedTrap[],
  };
}

export async function updateTrackConfig(
  id: string,
  sectors: SectorBoundary[],
  traps: SpeedTrap[],
): Promise<void> {
  const { error } = await supabase
    .from('track_configs')
    .update({
      sectors: sectors as unknown as import('./database.types').Json,
      traps: traps as unknown as import('./database.types').Json,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setDefaultTrackConfig(configId: string, trackId: string): Promise<void> {
  // Unset existing defaults for this track (RLS scopes to own configs)
  await supabase
    .from('track_configs')
    .update({ is_default: false })
    .eq('track_id', trackId)
    .eq('is_default', true);

  const { error } = await supabase
    .from('track_configs')
    .update({ is_default: true })
    .eq('id', configId);
  if (error) throw new Error(error.message);
}

export async function deleteTrackConfig(id: string): Promise<void> {
  const { error } = await supabase.from('track_configs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
