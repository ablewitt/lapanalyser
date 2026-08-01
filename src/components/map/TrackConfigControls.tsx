import { useEffect, useRef, useState } from 'react';
import { useSectorsStore } from '../../store/sectors';
import { useSpeedTrapsStore } from '../../store/speedTraps';
import {
  fetchTrackConfigsForCircuit, findOrCreateTrack, saveTrackConfig,
  updateTrackConfig, setDefaultTrackConfig, unsetDefaultTrackConfig, deleteTrackConfig,
} from '../../lib/trackConfigService';
import type { TrackConfig } from '../../lib/trackConfigService';
import ShareDialog from '../sharing/ShareDialog';
import styles from './TrackConfigControls.module.css';

interface Props {
  circuitName: string | null;
}

export default function TrackConfigControls({ circuitName }: Props) {
  const [configs, setConfigs] = useState<TrackConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [sharingConfig, setSharingConfig] = useState<TrackConfig | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the actions menu on outside click or Escape (mirrors the account menu).
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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

  async function handleToggleDefault() {
    if (!selected) return;
    setIsBusy(true);
    try {
      if (selected.is_default) {
        await unsetDefaultTrackConfig(selected.id);
        setConfigs(prev => prev.map(c => (c.id === selected.id ? { ...c, is_default: false } : c)));
      } else {
        await setDefaultTrackConfig(selected.id, selected.trackId);
        setConfigs(prev => prev.map(c => ({ ...c, is_default: c.id === selected.id })));
      }
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

  // Run a menu action then close the menu.
  const act = (fn: () => void) => () => { setMenuOpen(false); fn(); };

  return (
    <div className={styles.group}>
      {selected ? (
        <>
          <select
            className={styles.select}
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value || null)}
            disabled={isBusy}
            title="Switch track config"
          >
            {configs.map(c => (
              <option key={c.id} value={c.id}>
                {c.is_default ? '★ ' : ''}{c.name}
              </option>
            ))}
          </select>
          <button
            className={styles.btn}
            onClick={handleSave}
            disabled={isBusy}
            title="Overwrite this config with the current sectors & traps"
          >
            Save
          </button>
          <div className={styles.menuWrap} ref={menuRef}>
            <button
              className={styles.menuTrigger}
              onClick={() => setMenuOpen(o => !o)}
              disabled={isBusy}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Config actions"
            >
              •••
            </button>
            {menuOpen && (
              <div className={styles.menu} role="menu">
                <button className={styles.item} role="menuitem" onClick={act(handleLoad)}>
                  Load into map
                </button>
                <button className={styles.item} role="menuitem" onClick={act(handleSaveAs)}>
                  Save as new…
                </button>
                <button
                  className={styles.item}
                  role="menuitem"
                  onClick={act(handleToggleDefault)}
                >
                  {selected.is_default ? 'Remove as default' : 'Set as default'}
                </button>
                <button className={styles.item} role="menuitem" onClick={act(() => setSharingConfig(selected))}>
                  Share…
                </button>
                <div className={styles.divider} />
                <button className={`${styles.item} ${styles.itemDanger}`} role="menuitem" onClick={act(handleDelete)}>
                  Delete config
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <button
          className={styles.btn}
          onClick={handleSaveAs}
          disabled={isBusy}
          title="Save the current sectors & traps as a new config"
        >
          Save as config…
        </button>
      )}

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
    </div>
  );
}
