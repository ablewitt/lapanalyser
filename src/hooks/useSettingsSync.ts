import { useEffect, useRef } from 'react';
import { useUiStore } from '../store/ui';
import type { BaseMapLayer, HeatChannel } from '../store/ui';
import { useAuthStore } from '../store/auth';
import { loadUserSettings, saveUserSettings } from '../lib/userSettingsService';

export function useSettingsSync() {
  const user = useAuthStore(s => s.user);
  const mapBaseLayer = useUiStore(s => s.mapBaseLayer);
  const mapHeatChannel = useUiStore(s => s.mapHeatChannel);
  const mapShowSectors = useUiStore(s => s.mapShowSectors);
  const mapShowEvents = useUiStore(s => s.mapShowEvents);
  const mapShowTraps = useUiStore(s => s.mapShowTraps);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings from DB when user signs in
  useEffect(() => {
    if (!user) return;
    loadUserSettings().then(settings => {
      if (!settings) return;
      useUiStore.setState({
        mapBaseLayer: settings.map_base as BaseMapLayer,
        mapHeatChannel: settings.heat_channel as HeatChannel,
        mapShowSectors: settings.show_sectors,
        mapShowEvents: settings.show_events,
        mapShowTraps: settings.show_traps,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounce-save when any setting changes
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveUserSettings(userId, {
        map_base: mapBaseLayer,
        heat_channel: mapHeatChannel,
        show_heatmap: mapHeatChannel !== 'off',
        show_sectors: mapShowSectors,
        show_events: mapShowEvents,
        show_traps: mapShowTraps,
      });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mapBaseLayer, mapHeatChannel, mapShowSectors, mapShowEvents, mapShowTraps]);
}
