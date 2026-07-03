import { useMemo } from 'react';
import { useSessionsStore } from '../../store/sessions';
import { useSelectionStore } from '../../store/selection';
import { computeGroupStats } from '../../domain/statistics';
import { formatMs } from '../../utils/format';
import styles from './GroupStatsPanel.module.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

export default function GroupStatsPanel() {
  const sessions = useSessionsStore(s => s.sessions);
  const { groupA, groupB } = useSelectionStore();

  const allLaps = sessions.flatMap(s => s.laps);
  const lapsA = allLaps.filter(l => groupA.includes(l.id));
  const lapsB = allLaps.filter(l => groupB.includes(l.id));

  const statsA = useMemo(() => computeGroupStats(lapsA), [lapsA]);
  const statsB = useMemo(() => computeGroupStats(lapsB), [lapsB]);

  if (groupA.length === 0 && groupB.length === 0) {
    return (
      <p style={{ color: 'var(--text-dim)' }}>
        Assign laps to Group A and Group B in the sidebar to see statistical comparison.
      </p>
    );
  }

  // Build chart data
  const chartData = statsA.distances.map((d, i) => ({
    dist: d,
    aVel: statsA.meanVelocity[i],
    bVel: statsB.distances.length > i ? statsB.meanVelocity[i] : null,
    aAcc: statsA.meanLongAccG[i],
    bAcc: statsB.distances.length > i ? statsB.meanLongAccG[i] : null,
  }));

  const timeDeltaMs = statsA.meanLapTimeMs - statsB.meanLapTimeMs;

  return (
    <div className={styles.wrap}>
      <div className={styles.summaryRow}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Group A Laps</div>
          <div className={styles.cardValue}>{lapsA.length}</div>
          <div className={styles.cardSub}>Mean: {formatMs(statsA.meanLapTimeMs)} ± {(statsA.stdLapTimeMs / 1000).toFixed(3)}s</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Group B Laps</div>
          <div className={styles.cardValue}>{lapsB.length}</div>
          <div className={styles.cardSub}>Mean: {formatMs(statsB.meanLapTimeMs)} ± {(statsB.stdLapTimeMs / 1000).toFixed(3)}s</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Time Delta (A vs B)</div>
          <div className={styles.cardValue} style={{ color: timeDeltaMs > 0 ? '#e64c4c' : '#3cb44b' }}>
            {timeDeltaMs > 0 ? '+' : ''}{(timeDeltaMs / 1000).toFixed(3)}s
          </div>
          <div className={styles.cardSub}>{timeDeltaMs > 0 ? 'A is slower' : 'A is faster'}</div>
        </div>
      </div>

      <div className={styles.chartSection}>
        <div className={styles.chartLabel}>Mean Speed Comparison (km/h)</div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 16, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="dist" type="number" tick={{ fill: '#7c8db5', fontSize: 10 }} tickFormatter={v => `${v}m`} />
            <YAxis tick={{ fill: '#7c8db5', fontSize: 10 }} width={36} />
            <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {lapsA.length > 0 && <Line dataKey="aVel" name="Group A" stroke="#4f8ef7" dot={false} strokeWidth={1.5} isAnimationActive={false} />}
            {lapsB.length > 0 && <Line dataKey="bVel" name="Group B" stroke="#e64c4c" dot={false} strokeWidth={1.5} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartSection}>
        <div className={styles.chartLabel}>Mean Longitudinal Acceleration (g)</div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 16, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="dist" type="number" tick={{ fill: '#7c8db5', fontSize: 10 }} tickFormatter={v => `${v}m`} />
            <YAxis tick={{ fill: '#7c8db5', fontSize: 10 }} width={36} domain={[-1.5, 1.5]} />
            <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 11 }} />
            {lapsA.length > 0 && <Line dataKey="aAcc" name="Group A" stroke="#4f8ef7" dot={false} strokeWidth={1.5} isAnimationActive={false} />}
            {lapsB.length > 0 && <Line dataKey="bAcc" name="Group B" stroke="#e64c4c" dot={false} strokeWidth={1.5} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
