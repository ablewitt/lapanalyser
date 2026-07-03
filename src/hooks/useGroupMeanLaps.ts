import { useMemo } from 'react';
import { useSessionsStore } from '../store/sessions';
import { useSelectionStore } from '../store/selection';
import { buildMeanLap } from '../domain/groupLap';
import { GROUP_COLOR_A, GROUP_COLOR_B } from '../utils/colors';
import type { Lap } from '../domain/models';
import type { SelectedLap } from './useSelectedLaps';

export function useGroupMeanLaps(): SelectedLap[] {
  const sessions = useSessionsStore(s => s.sessions);
  const groupA = useSelectionStore(s => s.groupA);
  const groupB = useSelectionStore(s => s.groupB);

  return useMemo(() => {
    const allLaps = sessions.flatMap(s => s.laps);
    const resolve = (ids: string[]) =>
      ids.map(id => allLaps.find(l => l.id === id)).filter((l): l is Lap => l != null);

    const result: SelectedLap[] = [];

    const membersA = resolve(groupA);
    const lapA = buildMeanLap('group-mean-a', membersA);
    if (lapA) result.push({
      lap: lapA,
      color: GROUP_COLOR_A,
      colorIndex: 0,
      label: 'Group A',
    });

    const membersB = resolve(groupB);
    const lapB = buildMeanLap('group-mean-b', membersB);
    if (lapB) result.push({
      lap: lapB,
      color: GROUP_COLOR_B,
      colorIndex: 1,
      label: 'Group B',
    });

    return result;
  }, [sessions, groupA, groupB]);
}
