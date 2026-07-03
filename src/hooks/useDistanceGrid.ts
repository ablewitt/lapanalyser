import { useMemo } from 'react';
import type { Lap } from '../domain/models';
import { buildDistanceGrid, buildTimeGrid } from '../domain/trackDistance';
import type { DistanceGridSeries, TimeGridSeries } from '../domain/trackDistance';
import { lapColor } from '../utils/colors';
import type { SelectedLap } from './useSelectedLaps';

export function useDistanceGrid(selectedLaps: SelectedLap[]): DistanceGridSeries[] {
  return useMemo(() => {
    const grids = buildDistanceGrid(selectedLaps.map(s => s.lap));
    return grids.map((g, i) => ({ ...g, lapColor: selectedLaps[i]?.color }));
  }, [selectedLaps]);
}

export function useTimeGrid(selectedLaps: SelectedLap[]): TimeGridSeries[] {
  return useMemo(() => {
    const grids = buildTimeGrid(selectedLaps.map(s => s.lap));
    return grids.map((g, i) => ({ ...g, lapColor: selectedLaps[i]?.color }));
  }, [selectedLaps]);
}
