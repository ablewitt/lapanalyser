import { useMemo } from 'react';
import { useSessionsStore } from '../store/sessions';
import { useSelectionStore } from '../store/selection';
import { buildDistanceGrid, buildTimeGrid } from '../domain/trackDistance';
import type { DistanceGridSeries, TimeGridSeries } from '../domain/trackDistance';
import type { Lap } from '../domain/models';
import type { SelectedLap } from './useSelectedLaps';

import { lapColor } from '../utils/colors';

export const GROUP_COLOR_A = lapColor(0);
export const GROUP_COLOR_B = lapColor(1);

function meanArrays(arrays: number[][]): number[] {
  if (arrays.length === 0) return [];
  const len = arrays[0].length;
  return Array.from({ length: len }, (_, i) =>
    arrays.reduce((s, a) => s + (a[i] ?? 0), 0) / arrays.length,
  );
}

function makeDistMean(refLap: Lap, members: Lap[], id: string): DistanceGridSeries | null {
  if (members.length === 0) return null;
  // Prepend refLap so timeDeltaS is always computed vs the chart reference
  const grids = buildDistanceGrid([refLap, ...members]);
  const memberGrids = grids.slice(1);
  return {
    lapId: id,
    distances: grids[0].distances,
    velocityKmh: meanArrays(memberGrids.map(g => g.velocityKmh)),
    longAccG: meanArrays(memberGrids.map(g => g.longAccG)),
    leanAngleDeg: meanArrays(memberGrids.map(g => g.leanAngleDeg)),
    heading: meanArrays(memberGrids.map(g => g.heading)),
    heightM: meanArrays(memberGrids.map(g => g.heightM)),
    timeDeltaS: meanArrays(memberGrids.map(g => g.timeDeltaS)),
    lat: meanArrays(memberGrids.map(g => g.lat)),
    lng: meanArrays(memberGrids.map(g => g.lng)),
  };
}

function makeTimeMean(refLap: Lap, members: Lap[], id: string): TimeGridSeries | null {
  if (members.length === 0) return null;
  const grids = buildTimeGrid([refLap, ...members]);
  const memberGrids = grids.slice(1);
  return {
    lapId: id,
    times: grids[0].times,
    velocityKmh: meanArrays(memberGrids.map(g => g.velocityKmh)),
    longAccG: meanArrays(memberGrids.map(g => g.longAccG)),
    leanAngleDeg: meanArrays(memberGrids.map(g => g.leanAngleDeg)),
    distanceDeltaM: meanArrays(memberGrids.map(g => g.distanceDeltaM)),
    lat: meanArrays(memberGrids.map(g => g.lat)),
    lng: meanArrays(memberGrids.map(g => g.lng)),
  };
}

export function useGroupGrids(selectedLaps: SelectedLap[]) {
  const sessions = useSessionsStore(s => s.sessions);
  const groupA = useSelectionStore(s => s.groupA);
  const groupB = useSelectionStore(s => s.groupB);

  return useMemo(() => {
    const allLaps = sessions.flatMap(s => s.laps);
    const resolve = (ids: string[]) =>
      ids.map(id => allLaps.find(l => l.id === id)).filter((l): l is Lap => l != null);

    const membersA = resolve(groupA);
    const membersB = resolve(groupB);

    // Use the selected reference lap when available; otherwise fall back to the first
    // group member so group mean tracks render on the map with no laps selected.
    const refLap = selectedLaps[0]?.lap ?? membersA[0] ?? membersB[0];
    if (!refLap) return { distMeans: [], timeMeans: [], hasA: false, hasB: false };

    const distA = makeDistMean(refLap, membersA, 'group-mean-a');
    const distB = makeDistMean(refLap, membersB, 'group-mean-b');
    const timeA = makeTimeMean(refLap, membersA, 'group-mean-a');
    const timeB = makeTimeMean(refLap, membersB, 'group-mean-b');

    const distMeans: DistanceGridSeries[] = [];
    const timeMeans: TimeGridSeries[] = [];
    if (distA) distMeans.push(distA);
    if (distB) distMeans.push(distB);
    if (timeA) timeMeans.push(timeA);
    if (timeB) timeMeans.push(timeB);

    return { distMeans, timeMeans, hasA: distA !== null, hasB: distB !== null };
  }, [selectedLaps, sessions, groupA, groupB]);
}
