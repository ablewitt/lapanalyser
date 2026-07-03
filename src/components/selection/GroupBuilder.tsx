import styles from './GroupBuilder.module.css';
import { useSessionsStore } from '../../store/sessions';
import { useSelectionStore } from '../../store/selection';
import { formatMs } from '../../utils/format';
import { GROUP_COLOR_A, GROUP_COLOR_B } from '../../utils/colors';

export default function GroupBuilder() {
  const sessions = useSessionsStore(s => s.sessions);
  const { groupA, groupB, setGroupA, setGroupB } = useSelectionStore();

  if (sessions.every(s => s.laps.length === 0)) return null;

  const toggle = (lapId: string, group: 'A' | 'B') => {
    if (group === 'A') {
      setGroupA(groupA.includes(lapId) ? groupA.filter(id => id !== lapId) : [...groupA, lapId]);
    } else {
      setGroupB(groupB.includes(lapId) ? groupB.filter(id => id !== lapId) : [...groupB, lapId]);
    }
  };

  const renderLaps = (group: 'A' | 'B') => {
    const checked = group === 'A' ? groupA : groupB;
    return sessions.map(session => (
      <div key={session.id} className={styles.sessionGroup}>
        <div className={styles.sessionLabel} title={session.filename}>{session.filename.replace(/\.[^.]+$/, '')}</div>
        {session.laps.map(lap => (
          <label key={lap.id} className={styles.row}>
            <input type="checkbox" checked={checked.includes(lap.id)} onChange={() => toggle(lap.id, group)} />
            <span>Lap {lap.lapNumber}</span>
            <span className={styles.time}>{formatMs(lap.lapTimeMs)}</span>
          </label>
        ))}
      </div>
    ));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>Groups</div>
      <div className={styles.cols}>
        <div className={styles.col}>
          <div className={styles.colLabel} style={{ color: GROUP_COLOR_A }}>A</div>
          {renderLaps('A')}
        </div>
        <div className={styles.col}>
          <div className={styles.colLabel} style={{ color: GROUP_COLOR_B }}>B</div>
          {renderLaps('B')}
        </div>
      </div>
    </div>
  );
}
