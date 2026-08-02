import { useEffect, useRef, useState } from 'react';
import { useColumnResize } from '../../hooks/useColumnResize';
import { createPortal } from 'react-dom';
import styles from './SessionManager.module.css';
import { useSessionsStore } from '../../store/sessions';
import {
  fetchUserSessions, downloadSessionContent, renameSession,
  deleteSession, rekeySession, updateSessionMeta, detectCircuitName,
  fetchOwnerUsernames, fetchSessionsWithPrivateShares,
  updateSessionMetadata, readSessionMetadata,
} from '../../lib/sessionService';
import type { DbSessionRow } from '../../lib/sessionService';
import { parseVboContent } from '../../lib/parseWorker';
import { formatMs } from '../../utils/format';
import ShareDialog from '../sharing/ShareDialog';
import SessionMetadataDialog from './SessionMetadataDialog';
import { useAuthStore } from '../../store/auth';

type SortKey = 'date' | 'name' | 'venue' | 'laps' | 'best';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

interface Props {
  onClose: () => void;
}

export default function SessionManager({ onClose }: Props) {
  const { sessions, addSession, removeSession, renameSession: renameSessionInStore } = useSessionsStore();
  const currentUserId = useAuthStore(s => s.user?.id);
  const loadedIds = new Set(sessions.map(s => s.id));

  const [rows, setRows] = useState<DbSessionRow[]>([]);
  const [ownerUsernames, setOwnerUsernames] = useState<Record<string, string | null>>({});
  const [privatelySharedIds, setPrivatelySharedIds] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [hidePublic, setHidePublic] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sharingRow, setSharingRow] = useState<DbSessionRow | null>(null);
  const [editingRow, setEditingRow] = useState<DbSessionRow | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Resizable columns: [name, venue, date, laps, best]
  const { widths, onColMouseDown } = useColumnResize([220, 160, 90, 55, 85]);

  useEffect(() => {
    setIsFetching(true);
    fetchUserSessions()
      .then(async (fetched) => {
        setRows(fetched);
        const myIds = fetched.filter(r => r.user_id === currentUserId).map(r => r.id);
        const otherUserIds = [...new Set(fetched.filter(r => r.user_id !== currentUserId).map(r => r.user_id))];
        const [sharedIds, names] = await Promise.all([
          fetchSessionsWithPrivateShares(myIds),
          otherUserIds.length > 0 ? fetchOwnerUsernames(otherUserIds) : Promise.resolve({}),
        ]);
        setPrivatelySharedIds(sharedIds);
        setOwnerUsernames(names);
      })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.select();
  }, [renamingId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const setBusy = (id: string, busy: boolean) =>
    setBusyIds(prev => busy ? [...prev, id] : prev.filter(x => x !== id));

  async function handleLoad(row: DbSessionRow) {
    setBusy(row.id, true);
    try {
      const content = await downloadSessionContent(row.storage_path);
      const result = await parseVboContent(row.filename, content);
      const { session } = result;
      addSession({ ...rekeySession(session, row.id), displayName: row.display_name });

      // Backfill metadata if missing (sessions uploaded before these columns existed)
      if (row.lap_count == null || row.circuit_name == null) {
        const lapCount = session.laps.length;
        const bestLapTimeMs = lapCount > 0 ? Math.round(Math.min(...session.laps.map(l => l.lapTimeMs))) : null;
        const gpsPoints = session.laps.flatMap(l => l.points.map(p => p.gps));
        const circuitName = await detectCircuitName(gpsPoints);
        await updateSessionMeta(row.id, lapCount, bestLapTimeMs, circuitName);
        setRows(prev => prev.map(r => r.id === row.id
          ? { ...r, lap_count: lapCount, best_lap_time_ms: bestLapTimeMs, circuit_name: circuitName }
          : r,
        ));
      }
    } catch (e) {
      alert(`Load failed: ${(e as Error).message}`);
    } finally {
      setBusy(row.id, false);
    }
  }

  function handleUnload(id: string) {
    removeSession(id);
  }

  function startRename(row: DbSessionRow) {
    setRenamingId(row.id);
    setRenameValue(row.display_name ?? row.filename);
  }

  async function commitRename() {
    if (!renamingId) return;
    const id = renamingId;
    setRenamingId(null);
    try {
      const newName = renameValue.trim() || null;
      await renameSession(id, renameValue);
      setRows(prev => prev.map(r => r.id === id ? { ...r, display_name: newName } : r));
      renameSessionInStore(id, newName);
    } catch (e) {
      alert(`Rename failed: ${(e as Error).message}`);
    }
  }

  async function handleDelete(row: DbSessionRow) {
    setBusy(row.id, true);
    setConfirmDeleteId(null);
    try {
      await deleteSession(row.id, row.storage_path);
      removeSession(row.id);
      setRows(prev => prev.filter(r => r.id !== row.id));
    } catch (e) {
      alert(`Delete failed: ${(e as Error).message}`);
    } finally {
      setBusy(row.id, false);
    }
  }

  // Filter
  const q = search.toLowerCase().replace(/^@/, '');
  const filtered = rows.filter(r => {
    if (hidePublic && r.is_public) return false;
    return (
      !q ||
      (r.display_name ?? r.filename).toLowerCase().includes(q) ||
      (r.venue_raw ?? '').toLowerCase().includes(q) ||
      (r.circuit_name ?? '').toLowerCase().includes(q) ||
      (r.user_id !== currentUserId && (ownerUsernames[r.user_id] ?? '').toLowerCase().includes(q))
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'date') cmp = (a.date_recorded ?? a.created_at ?? '').localeCompare(b.date_recorded ?? b.created_at ?? '');
    else if (sortBy === 'name') cmp = (a.display_name ?? a.filename).localeCompare(b.display_name ?? b.filename);
    else if (sortBy === 'venue') cmp = (a.circuit_name ?? a.venue_raw ?? '').localeCompare(b.circuit_name ?? b.venue_raw ?? '');
    else if (sortBy === 'laps') cmp = (a.lap_count ?? 0) - (b.lap_count ?? 0);
    else if (sortBy === 'best') cmp = (a.best_lap_time_ms ?? Infinity) - (b.best_lap_time_ms ?? Infinity);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const modal = createPortal(
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>
            Sessions
            {!isFetching && <span className={styles.count}>({rows.length})</span>}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              className={styles.search}
              placeholder="Search by name, venue or @username…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <button
            className={`${styles.filterBtn} ${hidePublic ? styles.filterBtnActive : ''}`}
            onClick={() => setHidePublic(v => !v)}
            title="Hide public sessions"
          >Hide public</button>
          <span className={styles.sortLabel}>Sort:</span>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="venue">Venue</option>
            <option value="laps">Laps</option>
            <option value="best">Best time</option>
          </select>
          <button
            className={styles.dirBtn}
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div className={styles.tableWrap}>
          {isFetching ? (
            <div className={styles.loading}>Loading…</div>
          ) : sorted.length === 0 ? (
            <div className={styles.empty}>{search ? 'No sessions match your search.' : 'No sessions yet — drop a .vbo file to get started.'}</div>
          ) : (
            <table className={styles.table} style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 32 }} />
                <col style={{ width: widths[0] }} />
                <col style={{ width: widths[1] }} />
                <col style={{ width: widths[2] }} />
                <col style={{ width: widths[3] }} />
                <col style={{ width: widths[4] }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th />
                  <th>Name<div className={styles.resizeHandle} onMouseDown={onColMouseDown(0)} /></th>
                  <th>Venue<div className={styles.resizeHandle} onMouseDown={onColMouseDown(1)} /></th>
                  <th>Date<div className={styles.resizeHandle} onMouseDown={onColMouseDown(2)} /></th>
                  <th style={{ textAlign: 'right' }}>Laps<div className={styles.resizeHandle} onMouseDown={onColMouseDown(3)} /></th>
                  <th style={{ textAlign: 'right' }}>Best<div className={styles.resizeHandle} onMouseDown={onColMouseDown(4)} /></th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => {
                  const isOwn = row.user_id === currentUserId;
                  const isLoaded = loadedIds.has(row.id);
                  const isBusy = busyIds.includes(row.id);
                  const isConfirmingDelete = confirmDeleteId === row.id && isOwn;
                  const isRenaming = renamingId === row.id && isOwn;
                  const hasMeta = Object.keys(readSessionMetadata(row)).length > 0;

                  return (
                    <tr
                      key={row.id}
                      className={`${isLoaded ? styles.loaded : ''} ${isConfirmingDelete ? styles.deleting : ''}`}
                    >
                      <td>
                        <span className={`${styles.statusDot} ${isLoaded ? styles.active : ''}`} />
                      </td>
                      <td className={styles.nameCell}>
                        {isRenaming ? (
                          <input
                            ref={renameInputRef}
                            className={styles.nameInput}
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                          />
                        ) : (
                          <span
                            className={`${styles.nameText} ${!isOwn ? styles.nameReadOnly : ''}`}
                            title={isOwn ? 'Click to rename' : undefined}
                            onClick={() => { if (isOwn) startRename(row); }}
                          >
                            {row.display_name ?? row.filename}
                          </span>
                        )}
                        {row.user_id !== currentUserId && (
                          <span className={styles.ownerLabel}>
                            @{ownerUsernames[row.user_id] ?? row.user_id.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className={styles.dim}>{row.circuit_name ?? row.venue_raw ?? '—'}</td>
                      <td className={styles.dim}>{fmtDate(row.date_recorded)}</td>
                      <td className={styles.dim} style={{ textAlign: 'right' }}>{row.lap_count ?? '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {row.best_lap_time_ms != null ? formatMs(row.best_lap_time_ms) : '—'}
                      </td>
                      <td>
                        {isConfirmingDelete ? (
                          <div className={styles.confirmDelete}>
                            Delete?
                            <button className={styles.confirmDeleteBtn} onClick={() => handleDelete(row)}>Delete</button>
                            <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            {isLoaded ? (
                              <button className={styles.unloadBtn} onClick={() => handleUnload(row.id)} disabled={isBusy}>Unload</button>
                            ) : (
                              <button className={styles.loadBtn} onClick={() => handleLoad(row)} disabled={isBusy}>
                                {isBusy ? 'Loading…' : 'Load'}
                              </button>
                            )}
                            {isOwn && (
                              <button
                                onClick={() => setEditingRow(row)}
                                disabled={isBusy}
                                title={hasMeta ? 'Edit details (vehicle, setup, notes)' : 'Add details (vehicle, setup, notes)'}
                                style={{ color: hasMeta ? 'var(--accent)' : undefined }}
                              >ⓘ</button>
                            )}
                            {isOwn && (
                              <button
                                onClick={() => setSharingRow(row)}
                                disabled={isBusy}
                                title={row.is_public ? 'Public' : privatelySharedIds.has(row.id) ? 'Shared privately' : 'Share'}
                                style={{
                                  color: row.is_public
                                    ? 'var(--danger)'
                                    : privatelySharedIds.has(row.id)
                                      ? 'var(--success)'
                                      : undefined,
                                }}
                              >⇗</button>
                            )}
                            {isOwn && (
                              <button
                                className={styles.deleteBtn}
                                onClick={() => setConfirmDeleteId(row.id)}
                                disabled={isBusy}
                              >✕</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      {modal}
      {editingRow && (
        <SessionMetadataDialog
          title="Session details"
          subtitle={editingRow.filename}
          showName
          initialName={editingRow.display_name ?? ''}
          namePlaceholder={editingRow.filename}
          initial={readSessionMetadata(editingRow)}
          submitLabel="Save"
          onSubmit={async ({ name, metadata }) => {
            const row = editingRow;
            setEditingRow(null);
            try {
              // Rename only when changed; an empty name reverts to the filename.
              if (name.trim() !== (row.display_name ?? '')) {
                await renameSession(row.id, name);
                const newDisplay = name.trim() || null;
                setRows(prev => prev.map(r => r.id === row.id ? { ...r, display_name: newDisplay } : r));
                renameSessionInStore(row.id, newDisplay);
              }
              const saved = await updateSessionMetadata(row.id, metadata);
              setRows(prev => prev.map(r =>
                r.id === row.id ? { ...r, metadata: saved as DbSessionRow['metadata'] } : r,
              ));
            } catch (e) {
              alert(`Save failed: ${(e as Error).message}`);
            }
          }}
          onCancel={() => setEditingRow(null)}
        />
      )}
      {sharingRow && (
        <ShareDialog
          resourceType="session"
          resourceId={sharingRow.id}
          resourceName={sharingRow.display_name ?? sharingRow.filename}
          isPublic={sharingRow.is_public}
          onPublicChange={(isPublic) =>
            setRows(prev => prev.map(r => r.id === sharingRow.id ? { ...r, is_public: isPublic } : r))
          }
          onClose={async () => {
            if (sharingRow.user_id === currentUserId) {
              const updated = await fetchSessionsWithPrivateShares([sharingRow.id]);
              setPrivatelySharedIds(prev => {
                const next = new Set(prev);
                if (updated.has(sharingRow.id)) next.add(sharingRow.id);
                else next.delete(sharingRow.id);
                return next;
              });
            }
            setSharingRow(null);
          }}
        />
      )}
    </>
  );
}
