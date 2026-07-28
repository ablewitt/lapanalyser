import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  fetchStatsTotals, fetchDailyCounts, fetchTopCircuits,
} from '../../../lib/adminService';
import type { StatsTotals, DailyCount, TopCircuit } from '../../../lib/adminService';
import { formatBytes } from '../../../utils/format';
import styles from '../AdminLayout.module.css';

const RANGES = [7, 30, 90];

const AXIS = { fontSize: 11, fill: 'var(--text-dim)' };
const TOOLTIP_STYLE = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 };

export default function DashboardPanel() {
  const [totals, setTotals] = useState<StatsTotals | null>(null);
  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [circuits, setCircuits] = useState<TopCircuit[]>([]);
  const [days, setDays] = useState(30);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatsTotals()
      .then(t => { setTotals(t); setUpdatedAt(new Date()); })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load stats'));
    fetchTopCircuits().then(setCircuits).catch(() => {});
  }, []);

  useEffect(() => {
    fetchDailyCounts(days).then(setDaily).catch(() => {});
  }, [days]);

  // Each readout gets a timing-screen accent colour (its top-tick).
  const cards: { label: string; value: string; accent: string }[] = totals
    ? [
        { label: 'Users', value: String(totals.users), accent: 'var(--accent)' },
        { label: 'Sessions', value: String(totals.sessions), accent: 'var(--red)' },
        { label: 'Public sessions', value: String(totals.public_sessions), accent: 'var(--fastest)' },
        { label: 'Open tickets', value: String(totals.open_tickets), accent: 'var(--caution)' },
        { label: 'Storage', value: formatBytes(totals.storage_bytes), accent: 'var(--success)' },
      ]
    : [];

  const shortDay = (d: string) => d.slice(5); // MM-DD

  return (
    <div>
      <div className={styles.statusHead}>
        <div className={styles.eyebrow}>
          <span className={styles.pulse} aria-hidden />
          <span className={styles.eyebrowLive}>System status</span>
          <span className={styles.eyebrowSep}>/</span>
          <span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Loading…'}</span>
        </div>
        <h1 className={styles.panelTitle}>Dashboard</h1>
      </div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.statGrid}>
        {(cards.length ? cards : Array(5).fill({ label: '—', value: '—', accent: 'var(--border)' })).map((c, i) => (
          <div key={i} className={styles.statCard} style={{ ['--tick']: c.accent } as CSSProperties}>
            <div className={styles.statValue}>{c.value}</div>
            <div className={styles.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.chartHead}>
        <h2 className={styles.chartTitle}>Activity</h2>
        <div className={styles.rangeToggle}>
          {RANGES.map(r => (
            <button key={r} className={days === r ? styles.rangeActive : ''} onClick={() => setDays(r)}>{r}d</button>
          ))}
        </div>
      </div>

      <div className={styles.chartCard}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS} stroke="var(--border)" minTickGap={20} />
            <YAxis allowDecimals={false} tick={AXIS} stroke="var(--border)" />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(d) => shortDay(String(d))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="signups" name="New users" stroke="#4f8ef7" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#ff2e4d" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="active" name="Active users" stroke="#3cb44b" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2 className={styles.chartTitle} style={{ marginTop: 24 }}>Top circuits</h2>
      <div className={styles.chartCard}>
        <ResponsiveContainer width="100%" height={Math.max(160, circuits.length * 34)}>
          <BarChart data={circuits} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={AXIS} stroke="var(--border)" />
            <YAxis type="category" dataKey="circuit" width={150} tick={AXIS} stroke="var(--border)" />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="sessions" name="Sessions" fill="#4f8ef7" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
