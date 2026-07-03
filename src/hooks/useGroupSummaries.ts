import { useMemo } from 'react';
import { useSessionsStore } from '../store/sessions';
import { useSelectionStore } from '../store/selection';
import type { Lap, LapEvent } from '../domain/models';
import { GROUP_COLOR_A, GROUP_COLOR_B } from './useGroupGrids';

export interface GroupSummary {
  id: 'group-mean-a' | 'group-mean-b';
  label: string;
  color: string;
  memberCount: number;
  lapTimeMs: number;
  maxSpeedKmh: number;
  maxLeanAngleDeg: number;
  peakBrakingG: number;
  peakAccelG: number;
  events: Array<LapEvent & { lapLabel: string }>;
}

function avg(laps: Lap[], fn: (l: Lap) => number): number {
  return laps.reduce((s, l) => s + fn(l), 0) / laps.length;
}

function summarize(laps: Lap[], id: 'group-mean-a' | 'group-mean-b', color: string): GroupSummary | null {
  if (laps.length === 0) return null;
  return {
    id,
    label: id === 'group-mean-a' ? 'Group A' : 'Group B',
    color,
    memberCount: laps.length,
    lapTimeMs: avg(laps, l => l.lapTimeMs),
    maxSpeedKmh: avg(laps, l => l.metrics.maxSpeedKmh),
    maxLeanAngleDeg: avg(laps, l => l.metrics.maxLeanAngleDeg),
    peakBrakingG: avg(laps, l => l.metrics.peakBrakingG),
    peakAccelG: avg(laps, l => l.metrics.peakAccelG),
    events: laps.flatMap(l => l.events.map(ev => ({ ...ev, lapLabel: `L${l.lapNumber}` }))),
  };
}

export function useGroupSummaries(): GroupSummary[] {
  const sessions = useSessionsStore(s => s.sessions);
  const groupA = useSelectionStore(s => s.groupA);
  const groupB = useSelectionStore(s => s.groupB);

  return useMemo(() => {
    const allLaps = sessions.flatMap(s => s.laps);
    const resolve = (ids: string[]) =>
      ids.map(id => allLaps.find(l => l.id === id)).filter((l): l is Lap => l != null);

    const results: GroupSummary[] = [];
    const a = summarize(resolve(groupA), 'group-mean-a', GROUP_COLOR_A);
    const b = summarize(resolve(groupB), 'group-mean-b', GROUP_COLOR_B);
    if (a) results.push(a);
    if (b) results.push(b);
    return results;
  }, [sessions, groupA, groupB]);
}
