import { useEffect, useState } from 'react';
import { useSectorsStore } from '../../store/sectors';
import { useSpeedTrapsStore } from '../../store/speedTraps';
import {
  fetchTrackConfigsForCircuit, findOrCreateTrack, saveTrackConfig,
  updateTrackConfig, setDefaultTrackConfig, deleteTrackConfig,
} from '../../lib/trackConfigService';
import type { TrackConfig } from '../../lib/trackConfigService';
import ShareDialog from '../sharing/ShareDialog';

interface Props {
  circuitName: string | null;
}

export default function TrackConfigControls({ circuitName }: Props) {
  const [configs, setConfigs] = useState<TrackConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [sharingConfig, setSharingConfig] = useState<TrackConfig | null>(null);

  const sectors = useSectorsStore(s => s.boundaries);
  const addBoundary = useSectorsStore(s => s.addBoundary);
  const clearBoundaries = useSectorsStore(s => s.clearBoundaries);
  const traps = useSpeedTrapsStore(s => s.traps);
  const addTrap = useSpeedTrapsStore(s => s.addTrap);
  const clearTraps = useSpeedTrapsStore(s => s.clearTraps);

  useEffect(() => {
    if (!circuitName) { setConfigs([]); setSelectedId(null); return; }
    fetchTrackConfigsForCircuit(circuitName).then(loaded => {
      setConfigs(loaded);
      const def = loaded.find(c => c.is_default) ?? loaded[0];
      setSelectedId(def?.id ?? null);
    });
  }, [circuitName]);

  const selected = configs.find(c => c.id === selectedId) ?? null;

  async function handleLoad() {
    if (!selected) return;
    clearBoundaries();
    clearTraps();
    selected.sectors.forEach(addBoundary);
    selected.traps.forEach(addTrap);
  }

  async function handleSave() {
    if (!selected) return;
    setIsBusy(true);
    try {
      await updateTrackConfig(selected.id, sectors, traps);
      setConfigs(prev => prev.map(c =>
        c.id === selected.id ? { ...c, sectors, traps } : c,
      ));
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveAs() {
    if (!circuitName) return;
    const name = prompt('Config name:')?.trim();
    if (!name) return;

    if (configs.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert(`A config named "${name}" already exists for this circuit.`);
      return;
    }

    setIsBusy(true);
    try {
      const trackId = await findOrCreateTrack(circuitName);
      const created = await saveTrackConfig(trackId, name, sectors, traps);
      setConfigs(prev => [...prev, created]);
      setSelectedId(created.id);
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSetDefault() {
    if (!selected) return;
    setIsBusy(true);
    try {
      await setDefaultTrackConfig(selected.id, selected.trackId);
      setConfigs(prev => prev.map(c => ({ ...c, is_default: c.id === selected.id })));
    } catch (e) {
      alert(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!selected || !confirm(`Delete "${selected.name}"?`)) return;
    setIsBusy(true);
    try {
      await deleteTrackConfig(selected.id);
      const remaining = configs.filter(c => c.id !== selected.id);
      setConfigs(remaining);
      setSelectedId(remaining[0]?.id ?? null);
    } catch (e) {
      alert(`Delete failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  if (!circuitName) return null;

  return (
    <>
      <span style={{ borderLeft: '1px solid var(--border)', margin: '0 4px', alignSelf: 'stretch' }} />
      {configs.length > 0 && (
        <select
          style={{ fontSize: 12 }}
          value={selectedId ?? ''}
          onChange={e => setSelectedId(e.target.value || null)}
          disabled={isBusy}
        >
          {configs.map(c => (
            <option key={c.id} value={c.id}>
              {c.is_default ? '★ ' : ''}{c.name}
            </option>
          ))}
        </select>
      )}
      {selected && (
        <>
          <button onClick={handleLoad} disabled={isBusy} title="Apply this config to the map">Load</button>
          <button onClick={handleSave} disabled={isBusy} title="Overwrite this config with current sectors & traps">Save</button>
          <button
            onClick={handleSetDefault}
            disabled={isBusy || selected.is_default}
            title={selected.is_default ? 'Already default' : 'Set as default'}
          >★</button>
          <button onClick={handleDelete} disabled={isBusy} title="Delete config">✕</button>
          <button onClick={() => setSharingConfig(selected)} disabled={isBusy} title="Share config">⇗</button>
        </>
      )}
      <button onClick={handleSaveAs} disabled={isBusy} title="Save current sectors & traps as a new config">
        Save as…
      </button>
      {sharingConfig && (
        <ShareDialog
          resourceType="track_config"
          resourceId={sharingConfig.id}
          resourceName={sharingConfig.name}
          isPublic={sharingConfig.is_public}
          onPublicChange={(isPublic) => {
            setConfigs(prev => prev.map(c => c.id === sharingConfig.id ? { ...c, is_public: isPublic } : c));
            setSharingConfig(prev => prev ? { ...prev, is_public: isPublic } : null);
          }}
          onClose={() => setSharingConfig(null)}
        />
      )}
    </>
  );
}
