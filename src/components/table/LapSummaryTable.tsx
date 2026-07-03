import { useState } from 'react';
import type { SelectedLap } from '../../hooks/useSelectedLaps';
import { formatMs, formatKmh, formatG } from '../../utils/format';
import styles from './LapSummaryTable.module.css';

interface Props {
  selectedLaps: SelectedLap[];
}

type SortKey = 'lapNumber' | 'lapTimeMs' | 'maxSpeedKmh' | 'maxLeanAngleDeg' | 'peakBrakingG';

export default function LapSummaryTable({ selectedLaps }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('lapNumber');
  const [sortAsc, setSortAsc] = useState(true);

  if (selectedLaps.length === 0) {
    return <p style={{ color: 'var(--text-dim)' }}>No laps selected.</p>;
  }

  const sorted = [...selectedLaps].sort((a, b) => {
    const av = sortKey === 'lapNumber' ? a.lap.lapNumber : a.lap.metrics[sortKey as keyof typeof a.lap.metrics];
    const bv = sortKey === 'lapNumber' ? b.lap.lapNumber : b.lap.metrics[sortKey as keyof typeof b.lap.metrics];
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const th = (key: SortKey, label: string) => (
    <th className={styles.sortable} onClick={() => handleSort(key)}>
      {label} {sortKey === key ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <table>
      <thead>
        <tr>
          <th>Color</th>
          {th('lapNumber', 'Lap')}
          {th('lapTimeMs', 'Lap Time')}
          {th('maxSpeedKmh', 'Max Speed')}
          {th('maxLeanAngleDeg', 'Max Lean')}
          {th('peakBrakingG', 'Peak Braking')}
          <th>Peak Accel</th>
          <th>Session</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(({ lap, color, label, sessionLabel }) => (
          <tr key={lap.id}>
            <td><span style={{ display: 'inline-block', width: 12, height: 12, background: color, borderRadius: 2 }} /></td>
            <td>{label ?? lap.lapNumber}</td>
            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMs(lap.lapTimeMs)}</td>
            <td>{formatKmh(lap.metrics.maxSpeedKmh)}</td>
            <td>{lap.metrics.maxLeanAngleDeg.toFixed(1)}°</td>
            <td>{formatG(lap.metrics.peakBrakingG)}</td>
            <td>{formatG(lap.metrics.peakAccelG)}</td>
            <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{sessionLabel ?? lap.sessionId.split('_')[0]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
