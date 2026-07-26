import { useEffect, useState, useCallback } from 'react';
import {
  fetchAuditLog, fetchAllAuditRows, listUsers, AUDIT_ACTIONS,
} from '../../../lib/adminService';
import type { AuditLogRow, AuditFilters, AdminUser } from '../../../lib/adminService';
import { downloadCsv } from '../../../utils/csv';
import styles from '../AdminLayout.module.css';

const PAGE = 100;

const ACTION_LABELS: Record<string, string> = {
  'user.signup': 'Signed up',
  'user.role_change': 'Role changed',
  'user.delete': 'User deleted',
  'session.create': 'Session created',
  'session.delete': 'Session deleted',
  'session.visibility': 'Visibility changed',
  'session.share.add': 'Session shared',
  'session.share.remove': 'Session unshared',
  'ticket.create': 'Ticket opened',
  'ticket.message': 'Message sent',
  'ticket.status': 'Ticket status changed',
};

function toIso(date: string, endOfDay: boolean): string {
  return new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`).toISOString();
}

export default function AuditPanel() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters: AuditFilters = {
    from: from ? toIso(from, false) : undefined,
    to: to ? toIso(to, true) : undefined,
    actorId: actorId || undefined,
    action: action || undefined,
  };

  useEffect(() => { listUsers().then(setUsers).catch(() => setUsers([])); }, []);

  const userMap = new Map(users.map(u => [u.id, u.username || u.email]));
  const nameOf = (id: string | null) => (id ? userMap.get(id) ?? id.slice(0, 8) : '—');

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const nextOffset = reset ? 0 : offset;
      const batch = await fetchAuditLog(filters, PAGE, nextOffset);
      setRows(prev => (reset ? batch : [...prev, ...batch]));
      setOffset(nextOffset + batch.length);
      setHasMore(batch.length === PAGE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, from, to, actorId, action]);

  // Reload from the top whenever a filter changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(true); }, [from, to, actorId, action]);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const all = await fetchAllAuditRows(filters);
      downloadCsv(
        `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Time', 'Actor', 'Actor ID', 'Action', 'Target type', 'Target ID', 'Details'],
        all.map(r => [
          r.created_at,
          nameOf(r.actor_id),
          r.actor_id ?? '',
          r.action,
          r.target_type ?? '',
          r.target_id ?? '',
          JSON.stringify(r.metadata),
        ]),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className={styles.auditHead}>
        <h1 className={styles.panelTitle}>Audit log</h1>
        <button onClick={exportCsv} disabled={exporting}>{exporting ? 'Exporting…' : 'Export CSV'}</button>
      </div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.auditFilters}>
        <label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <label>User
          <select value={actorId} onChange={e => setActorId(e.target.value)}>
            <option value="">Anyone</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username || u.email}</option>)}
          </select>
        </label>
        <label>Action
          <select value={action} onChange={e => setAction(e.target.value)}>
            <option value="">All</option>
            {AUDIT_ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Time</th><th>Actor</th><th>Action</th><th>Details</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className={styles.auditTime}>{new Date(r.created_at).toLocaleString()}</td>
                <td>{nameOf(r.actor_id)}</td>
                <td>{ACTION_LABELS[r.action] ?? r.action}</td>
                <td className={styles.auditDetails}>{describe(r, nameOf)}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={4} className={styles.muted}>No matching entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className={styles.auditMore}>
          <button onClick={() => load(false)} disabled={loading}>{loading ? 'Loading…' : 'Load more'}</button>
        </div>
      )}
    </div>
  );
}

function describe(row: AuditLogRow, nameOf: (id: string | null) => string): string {
  const m = (row.metadata ?? {}) as Record<string, unknown>;
  switch (row.action) {
    case 'user.signup':
    case 'user.delete':
      return String(m.email ?? '');
    case 'user.role_change':
      return `${m.from} → ${m.to}`;
    case 'session.create':
      return [m.filename, m.circuit].filter(Boolean).join(' · ');
    case 'session.delete':
      return `${m.filename ?? ''}${m.owner ? ` (owner ${nameOf(m.owner as string)})` : ''}`;
    case 'session.visibility':
      return m.is_public ? 'made public' : 'made private';
    case 'session.share.add':
      return `with ${nameOf(m.shared_with as string)}`;
    case 'session.share.remove':
      return `from ${nameOf(m.shared_with as string)}`;
    case 'ticket.create':
      return String(m.subject ?? '');
    case 'ticket.status':
      return `${m.from} → ${m.to}`;
    case 'ticket.message':
      return m.internal ? 'internal note' : 'reply';
    default:
      return '';
  }
}
