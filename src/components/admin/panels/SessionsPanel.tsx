import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAllSessions, setSessionPublic } from '../../../lib/adminService';
import type { AdminSession } from '../../../lib/adminService';
import { deleteSession } from '../../../lib/sessionService';
import styles from '../AdminLayout.module.css';

export default function SessionsPanel() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await listAllSessions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function togglePublic(s: AdminSession) {
    const next = !s.row.is_public;
    setBusy(s.row.id);
    try {
      await setSessionPublic(s.row.id, next);
      setSessions(prev => prev.map(x => (x.row.id === s.row.id ? { ...x, row: { ...x.row, is_public: next } } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update session');
    } finally {
      setBusy(null);
    }
  }

  async function remove(s: AdminSession) {
    const label = s.row.display_name || s.row.filename;
    if (!confirm(`Delete session "${label}"? This removes the file and cannot be undone.`)) return;
    setBusy(s.row.id);
    try {
      await deleteSession(s.row.id, s.row.storage_path);
      setSessions(prev => prev.filter(x => x.row.id !== s.row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete session');
    } finally {
      setBusy(null);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sessions.filter(s =>
        (s.row.display_name || s.row.filename).toLowerCase().includes(q)
        || (s.ownerName ?? '').toLowerCase().includes(q)
        || (s.row.circuit_name ?? s.row.venue_raw ?? '').toLowerCase().includes(q))
    : sessions;

  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div>
      <h1 className={styles.panelTitle}>Sessions</h1>
      {error && <div className={styles.error}>{error}</div>}

      <input
        className={styles.search}
        placeholder="Search filename, owner, circuit…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Session</th><th>Owner</th><th>Circuit</th><th>Date</th>
              <th>Laps</th><th>Public</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.row.id}>
                <td data-primary className={styles.userName}>{s.row.display_name || s.row.filename}</td>
                <td data-label="Owner">{s.ownerName || <span className={styles.dim}>—</span>}</td>
                <td data-label="Circuit">{s.row.circuit_name || s.row.venue_raw || <span className={styles.dim}>—</span>}</td>
                <td data-label="Date" className={styles.num}>{fmtDate(s.row.date_recorded)}</td>
                <td data-label="Laps" className={styles.num}>{s.row.lap_count ?? '—'}</td>
                <td data-label="Visibility">
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={s.row.is_public}
                      disabled={busy === s.row.id}
                      onChange={() => togglePublic(s)}
                    />
                    {s.row.is_public ? 'public' : 'private'}
                  </label>
                </td>
                <td data-label="" className={styles.rowActions}>
                  <button onClick={() => navigate(`/app?openSession=${s.row.id}`)}>Open</button>
                  <button className={styles.dangerBtn} disabled={busy === s.row.id} onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
