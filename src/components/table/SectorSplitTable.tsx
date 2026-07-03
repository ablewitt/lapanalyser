import { useMemo } from 'react';
import type { SelectedLap } from '../../hooks/useSelectedLaps';
import { useSelectionStore } from '../../store/selection';
import { useSectorsStore } from '../../store/sectors';
import { computeSectorResults } from '../../domain/sectors';
import { formatMs } from '../../utils/format';
import type { SectorResult } from '../../domain/models';

interface Props {
  selectedLaps: SelectedLap[];
}

function formatDeltaMs(deltaMs: number): string {
  const sign = deltaMs >= 0 ? '+' : '-';
  const abs = Math.abs(deltaMs) / 1000;
  return `${sign}${abs.toFixed(3)}s`;
}

const FASTEST_STYLE: React.CSSProperties = { background: 'rgba(60,180,75,0.18)', fontWeight: 600 };

export default function SectorSplitTable({ selectedLaps }: Props) {
  const boundaries = useSectorsStore(s => s.boundaries);
  const referenceLapId = useSelectionStore(s => s.referenceLapId);

  const lapResults = useMemo(() =>
    selectedLaps.map(({ lap }) => computeSectorResults(boundaries, lap)),
    [boundaries, selectedLaps],
  );

  if (boundaries.length === 0) {
    return <p style={{ color: 'var(--text-dim)' }}>Add sector boundaries on the map to see split times.</p>;
  }

  if (selectedLaps.length === 0) {
    return <p style={{ color: 'var(--text-dim)' }}>No laps selected.</p>;
  }

  const refIdx = referenceLapId
    ? Math.max(0, selectedLaps.findIndex(s => s.lap.id === referenceLapId))
    : 0;
  const refResults: SectorResult[] = lapResults[refIdx] ?? [];
  const refLapTimeMs = selectedLaps[refIdx]?.lap.lapTimeMs ?? 0;
  const sectorCount = refResults.length;
  const sectorLabels = refResults.map(r => r.label);

  const allLapTimes = selectedLaps.map(s => s.lap.lapTimeMs);
  const fastestLapTime = Math.min(...allLapTimes);

  const fastestSectorMs: number[] = Array.from({ length: sectorCount }, (_, si) =>
    Math.min(...lapResults.map(r => r[si]?.timeMs ?? Infinity)),
  );

  const renderSectorCells = (results: SectorResult[], lapTimeMs: number, isRef: boolean) =>
    results.map((r, si) => {
      const isFastest = r.timeMs === fastestSectorMs[si];
      const delta = isRef ? null : r.timeMs - refResults[si].timeMs;
      return (
        <td key={r.label} style={{ fontVariantNumeric: 'tabular-nums', ...(isFastest ? FASTEST_STYLE : undefined) }}>
          {formatMs(r.timeMs)}
          {delta !== null && (
            <span style={{ marginLeft: 6, fontSize: 11, color: delta <= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatDeltaMs(delta)}
            </span>
          )}
        </td>
      );
    });

  return (
    <table>
      <thead>
        <tr>
          <th>Color</th>
          <th>Lap</th>
          <th>Lap Time</th>
          <th>Delta</th>
          {sectorLabels.map(label => <th key={label}>{label}</th>)}
        </tr>
      </thead>
      <tbody>
        {selectedLaps.map(({ lap, color, label }, i) => {
          const isRef = i === refIdx;
          const isFastestLap = lap.lapTimeMs === fastestLapTime;
          const lapDelta = lap.lapTimeMs - refLapTimeMs;
          return (
            <tr key={lap.id} style={isFastestLap ? FASTEST_STYLE : undefined}>
              <td><span style={{ display: 'inline-block', width: 12, height: 12, background: color, borderRadius: 2 }} /></td>
              <td>
                {label ?? lap.lapNumber}
                {isRef && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em' }}>REF</span>}
              </td>
              <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMs(lap.lapTimeMs)}</td>
              <td style={{ fontVariantNumeric: 'tabular-nums', color: isRef ? 'var(--text-dim)' : lapDelta <= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {isRef ? '—' : formatDeltaMs(lapDelta)}
              </td>
              {renderSectorCells(lapResults[i], lap.lapTimeMs, isRef)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
