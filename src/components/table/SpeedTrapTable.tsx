import { useMemo } from 'react';
import type { SelectedLap } from '../../hooks/useSelectedLaps';
import { useSelectionStore } from '../../store/selection';
import { useSpeedTrapsStore } from '../../store/speedTraps';
import { computeSpeedTrapResults } from '../../domain/speedTraps';
import { formatMs, formatKmh, formatG, formatDist } from '../../utils/format';
import type { GpsCoord, SpeedTrap } from '../../domain/models';

interface Props {
  selectedLaps: SelectedLap[];
  onTrapHover?: (gps: GpsCoord, color: string) => void;
  onTrapLeave?: () => void;
}

function formatDeltaMs(deltaMs: number): string {
  const sign = deltaMs >= 0 ? '+' : '-';
  return `${sign}${(Math.abs(deltaMs) / 1000).toFixed(3)}s`;
}

function formatDeltaKmh(delta: number): string {
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`;
}

function formatLean(deg: number): string {
  return `${deg.toFixed(1)}°`;
}

const TRAP_COLOR = '#f59e0b';
const FASTEST_STYLE: React.CSSProperties = { background: 'rgba(60,180,75,0.18)', fontWeight: 600 };

interface TrapTableProps {
  trap: SpeedTrap;
  label: string;
  selectedLaps: SelectedLap[];
  refIdx: number;
  trapIdx: number;
  lapResults: ReturnType<typeof computeSpeedTrapResults>[];
  fastestLapTime: number;
  onTrapHover?: (gps: GpsCoord, color: string) => void;
  onTrapLeave?: () => void;
}

function SingleTrapTable({
  trap, label, selectedLaps, refIdx, trapIdx, lapResults, fastestLapTime, onTrapHover, onTrapLeave,
}: TrapTableProps) {
  const refLapTimeMs = selectedLaps[refIdx]?.lap.lapTimeMs ?? 0;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
        color: TRAP_COLOR, fontWeight: 700, fontSize: 13, letterSpacing: '0.03em',
      }}>
        <span style={{
          display: 'inline-block', width: 14, height: 14,
          background: TRAP_COLOR, borderRadius: 3,
        }} />
        {label}
        <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 11 }}>
          · {formatDist(trap.distanceAlongLapM)} from start
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Color</th>
            <th>Lap</th>
            <th>Lap Time</th>
            <th>Speed</th>
            <th>ΔSpd</th>
            <th>Lean</th>
            <th>Long G</th>
            <th>ΔTime</th>
          </tr>
        </thead>
        <tbody>
          {selectedLaps.map(({ lap, color, label: lapLabel }, lapIdx) => {
            const isRef = lapIdx === refIdx;
            const isFastest = lap.lapTimeMs === fastestLapTime;
            const lapDelta = lap.lapTimeMs - refLapTimeMs;
            const result = lapResults[lapIdx]?.[trapIdx];

            return (
              <tr
                key={lap.id}
                style={{
                  cursor: onTrapHover ? 'pointer' : undefined,
                  ...(isFastest ? FASTEST_STYLE : undefined),
                }}
                onMouseEnter={() => onTrapHover?.(trap.gps, TRAP_COLOR)}
                onMouseLeave={onTrapLeave}
                onClick={() => onTrapHover?.(trap.gps, TRAP_COLOR)}
              >
                <td>
                  <span style={{ display: 'inline-block', width: 12, height: 12, background: color, borderRadius: 2 }} />
                </td>
                <td>
                  {lapLabel ?? lap.lapNumber}
                  {isRef && (
                    <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em' }}>REF</span>
                  )}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMs(lap.lapTimeMs)}
                  {!isRef && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: lapDelta <= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatDeltaMs(lapDelta)}
                    </span>
                  )}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {result ? formatKmh(result.snapshot.speedKmh) : '—'}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: !result || result.speedDeltaKmh === null ? 'var(--text-dim)' : result.speedDeltaKmh >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {result?.speedDeltaKmh === null || result?.speedDeltaKmh === undefined ? '—' : formatDeltaKmh(result.speedDeltaKmh)}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {result ? formatLean(result.snapshot.leanAngleDeg) : '—'}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {result ? formatG(result.snapshot.longAccG) : '—'}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: !result || result.timeDeltaMs === null ? 'var(--text-dim)' : result.timeDeltaMs <= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {result?.timeDeltaMs === null || result?.timeDeltaMs === undefined ? '—' : formatDeltaMs(result.timeDeltaMs)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SpeedTrapTable({ selectedLaps, onTrapHover, onTrapLeave }: Props) {
  const traps = useSpeedTrapsStore(s => s.traps);
  const referenceLapId = useSelectionStore(s => s.referenceLapId);

  const sortedTraps = useMemo(
    () => [...traps].sort((a, b) => a.distanceAlongLapM - b.distanceAlongLapM),
    [traps],
  );

  const refIdx = referenceLapId
    ? Math.max(0, selectedLaps.findIndex(s => s.lap.id === referenceLapId))
    : 0;
  const referenceLap = selectedLaps[refIdx]?.lap;

  const lapResults = useMemo(() =>
    selectedLaps.map(({ lap }) =>
      computeSpeedTrapResults(traps, lap, lap === referenceLap ? undefined : referenceLap),
    ),
    [traps, selectedLaps, referenceLap],
  );

  if (traps.length === 0) {
    return <p style={{ color: 'var(--text-dim)' }}>Add speed traps on the map to see trap data.</p>;
  }

  if (selectedLaps.length === 0) {
    return <p style={{ color: 'var(--text-dim)' }}>No laps selected.</p>;
  }

  const allLapTimes = selectedLaps.map(s => s.lap.lapTimeMs);
  const fastestLapTime = Math.min(...allLapTimes);

  return (
    <div>
      {sortedTraps.map((trap, trapIdx) => (
        <SingleTrapTable
          key={trap.id}
          trap={trap}
          label={`T${trapIdx + 1}`}
          selectedLaps={selectedLaps}
          refIdx={refIdx}
          trapIdx={trapIdx}
          lapResults={lapResults}
          fastestLapTime={fastestLapTime}
          onTrapHover={onTrapHover}
          onTrapLeave={onTrapLeave}
        />
      ))}
    </div>
  );
}
