import { useState } from 'react';
import type { SelectedLap } from '../../hooks/useSelectedLaps';
import { type EventType } from '../../domain/models';
import { formatKmh, formatDist, formatG } from '../../utils/format';

const EVENT_COLORS: Record<EventType, string> = {
  BRAKING: '#e64c4c',
  APEX: '#f58231',
  ACCELERATION: '#3cb44b',
  TOP_SPEED: '#4f8ef7',
};

interface Props {
  selectedLaps: SelectedLap[];
}

export default function EventTable({ selectedLaps }: Props) {
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');

  const allEvents = selectedLaps
    .flatMap(({ lap, color, label }) =>
      lap.events
        .filter(ev => filter === 'ALL' || ev.type === filter)
        .map(ev => ({ ev, label: label ?? `${lap.lapNumber}`, color }))
    )
    .sort((a, b) => a.ev.distanceAlongLapM - b.ev.distanceAlongLapM);

  if (selectedLaps.length === 0) return <p style={{ color: 'var(--text-dim)' }}>No laps selected.</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(['ALL', 'BRAKING', 'APEX', 'ACCELERATION', 'TOP_SPEED'] as const).map(t => (
          <button
            key={t}
            className={filter === t ? 'active' : ''}
            style={{ fontSize: 11, padding: '2px 8px' }}
            onClick={() => setFilter(t)}
          >
            {t === 'ALL' ? 'All' : t === 'TOP_SPEED' ? 'Top Speed' :
             t === 'ACCELERATION' ? 'Accel' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>Lap</th>
            <th>Type</th>
            <th>Distance</th>
            <th>Speed</th>
            <th>Long Acc</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {allEvents.map(({ ev, label, color }, i) => (
            <tr key={i}>
              <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, background: color, borderRadius: 2, display: 'inline-block' }} />
                {label}
              </span></td>
              <td>
                <span style={{ color: EVENT_COLORS[ev.type], fontWeight: 600, fontSize: 11 }}>
                  {ev.type === 'TOP_SPEED' ? 'Top Speed' : ev.type.charAt(0) + ev.type.slice(1).toLowerCase()}
                </span>
              </td>
              <td>{formatDist(ev.distanceAlongLapM)}</td>
              <td>{formatKmh(ev.velocityKmh)}</td>
              <td>{formatG(ev.longAccG)}</td>
              <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                {ev.detail.type === 'BRAKING' && `Entry: ${ev.detail.entrySpeedKmh.toFixed(0)} km/h, Peak: ${ev.detail.peakDecelG.toFixed(3)}g`}
                {ev.detail.type === 'APEX' && `Lean: ${ev.detail.leanAngleDeg.toFixed(1)}°`}
                {ev.detail.type === 'ACCELERATION' && `Exit: ${ev.detail.exitSpeedKmh.toFixed(0)} km/h, Peak: ${ev.detail.peakAccelG.toFixed(3)}g`}
                {ev.detail.type === 'TOP_SPEED' && `${ev.velocityKmh.toFixed(1)} km/h`}
              </td>
            </tr>
          ))}
          {allEvents.length === 0 && (
            <tr><td colSpan={6} style={{ color: 'var(--text-dim)', textAlign: 'center' }}>No events detected</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
