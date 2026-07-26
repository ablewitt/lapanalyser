import { useEffect, useState } from 'react';
import { fetchAdminOverview } from '../../../lib/adminService';
import type { AdminOverview } from '../../../lib/adminService';
import styles from '../AdminLayout.module.css';

const STATS: { key: keyof AdminOverview; label: string }[] = [
  { key: 'userCount', label: 'Users' },
  { key: 'sessionCount', label: 'Sessions' },
  { key: 'trackConfigCount', label: 'Track configs' },
  { key: 'publicSessionCount', label: 'Public sessions' },
];

export default function DashboardPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminOverview()
      .then(setOverview)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load stats'));
  }, []);

  return (
    <div>
      <h1 className={styles.panelTitle}>Dashboard</h1>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.statGrid}>
        {STATS.map(s => (
          <div key={s.key} className={styles.statCard}>
            <div className={styles.statValue}>{overview ? overview[s.key] : '—'}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
