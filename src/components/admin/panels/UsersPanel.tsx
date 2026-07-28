import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../../store/auth';
import { listUsers, setUserRole, deleteUser } from '../../../lib/adminService';
import type { AdminUser } from '../../../lib/adminService';
import { formatBytes } from '../../../utils/format';
import styles from '../AdminLayout.module.css';

export default function UsersPanel() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeRole(u: AdminUser, role: 'user' | 'admin') {
    setBusy(u.id);
    try {
      await setUserRole(u.id, role);
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, role } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change role');
    } finally {
      setBusy(null);
    }
  }

  async function removeUser(u: AdminUser) {
    const label = u.username || u.email;
    if (!confirm(`Delete ${label}? This removes their account, sessions and files. This cannot be undone.`)) return;
    setBusy(u.id);
    try {
      await deleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete user');
    } finally {
      setBusy(null);
    }
  }

  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div>
      <h1 className={styles.panelTitle}>Users</h1>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th><th>Role</th><th>Joined</th><th>Last seen</th>
              <th>Sessions</th><th>Storage</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td data-primary>
                  <div className={styles.userName}>{u.username || <span className={styles.dim}>no username</span>}</div>
                  <div className={styles.userEmail}>{u.email}</div>
                </td>
                <td data-label="Role">
                  <select
                    value={u.role}
                    disabled={busy === u.id}
                    onChange={e => changeRole(u, e.target.value as 'user' | 'admin')}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td data-label="Joined" className={styles.num}>{fmtDate(u.created_at)}</td>
                <td data-label="Last seen" className={styles.num}>{fmtDate(u.last_sign_in_at)}</td>
                <td data-label="Sessions" className={styles.num}>{u.session_count}</td>
                <td data-label="Storage" className={styles.num}>{formatBytes(u.storage_bytes)}</td>
                <td data-label="">
                  {u.id !== currentUserId && (
                    <button className={styles.dangerBtn} disabled={busy === u.id} onClick={() => removeUser(u)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
