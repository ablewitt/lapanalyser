import styles from './SessionTree.module.css';
import { useSessionsStore } from '../../store/sessions';
import { useSelectionStore } from '../../store/selection';
import { lapColor } from '../../utils/colors';
import { formatMs } from '../../utils/format';
import { useGroupMeanLaps } from '../../hooks/useGroupMeanLaps';
import CircuitPicker from './CircuitPicker';

export default function SessionTree() {
  const sessions = useSessionsStore(s => s.sessions);
  const removeSession = useSessionsStore(s => s.removeSession);
  const { selectedLapIds, referenceLapId, toggleLap, setReferenceLapId } = useSelectionStore();
  const groupMeanLaps = useGroupMeanLaps();

  const effectiveRefId = referenceLapId ?? selectedLapIds[0] ?? null;

  if (sessions.length === 0 && groupMeanLaps.length === 0) {
    return <p className={styles.empty}>No sessions loaded — open Sessions to load one</p>;
  }

  return (
    <div className={styles.tree}>
      {sessions.map(session => (
        <div key={session.id} className={styles.session}>
          <div className={styles.sessionHeader}>
            <span className={styles.venue}>{session.venue}</span>
            <button className={`danger ${styles.removeBtn}`} onClick={() => removeSession(session.id)}>×</button>
          </div>
          <span className={styles.filename}>{session.displayName ?? session.filename}</span>
          <CircuitPicker session={session} />
          <div className={styles.laps}>
            {session.laps.map((lap) => {
              const selected = selectedLapIds.includes(lap.id);
              const colorIdx = selectedLapIds.indexOf(lap.id);
              const isRef = selected && lap.id === effectiveRefId;
              const isPinned = lap.id === referenceLapId;
              return (
                <div key={lap.id} className={`${styles.lapRow} ${selected ? styles.selected : ''}`}>
                  <label className={styles.lapLabel}>
                    <input type="checkbox" checked={selected} onChange={() => toggleLap(lap.id)} />
                    <span
                      className={styles.colorSwatch}
                      style={{ background: selected ? lapColor(colorIdx + 2) : 'var(--border)' }}
                    />
                    <span>Lap {lap.lapNumber}</span>
                    <span className={styles.lapTime}>{formatMs(lap.lapTimeMs)}</span>
                  </label>
                  {selected && (
                    <button
                      className={`${styles.pinBtn} ${isRef ? styles.pinActive : ''}`}
                      title={isPinned ? 'Unpin reference lap' : 'Set as reference lap'}
                      onClick={() => setReferenceLapId(isPinned ? null : lap.id)}
                    >
                      {isRef ? '★' : '☆'}
                    </button>
                  )}
                </div>
              );
            })}
            {session.laps.length === 0 && <span className={styles.noLaps}>No complete laps detected</span>}
          </div>
        </div>
      ))}

      {groupMeanLaps.length > 0 && (
        <div className={styles.session}>
          <div className={styles.sessionHeader}>
            <span className={styles.venue}>Group Means</span>
          </div>
          <div className={styles.laps}>
            {groupMeanLaps.map(({ lap, color, label }) => {
              const isRef = lap.id === effectiveRefId;
              const isPinned = lap.id === referenceLapId;
              return (
                <div key={lap.id} className={`${styles.lapRow} ${styles.selected}`}>
                  <label className={styles.lapLabel}>
                    <span className={styles.colorSwatch} style={{ background: color }} />
                    <span>{label}</span>
                    <span className={styles.lapTime}>{formatMs(lap.lapTimeMs)}</span>
                  </label>
                  <button
                    className={`${styles.pinBtn} ${isRef ? styles.pinActive : ''}`}
                    title={isPinned ? 'Unpin reference' : 'Set as reference'}
                    onClick={() => setReferenceLapId(isPinned ? null : lap.id)}
                  >
                    {isRef ? '★' : '☆'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
