import { useState } from 'react';
import type { Session } from '../../domain/models';
import { useSessionCircuit } from '../../hooks/useSessionCircuit';
import styles from './CircuitPicker.module.css';

interface Props {
  session: Session;
}

export default function CircuitPicker({ session }: Props) {
  const { detected, active, nearbyCircuits, setOverride } = useSessionCircuit(session);
  const [open, setOpen] = useState(false);

  if (!detected && nearbyCircuits.length === 0) return null;

  const label = active?.name ?? 'Unknown circuit';
  const isOverridden = active?.path !== detected?.path;

  return (
    <div className={styles.wrap}>
      {!open ? (
        <div className={styles.row}>
          <span className={styles.label} title={label}>{label}</span>
          {isOverridden && (
            <button
              className={styles.btn}
              title="Revert to auto-detected circuit"
              onClick={() => setOverride(undefined)}
            >↺</button>
          )}
          <button className={styles.btn} onClick={() => setOpen(true)}>✎</button>
        </div>
      ) : (
        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={active?.path ?? ''}
            onChange={e => {
              setOverride(e.target.value || null);
              setOpen(false);
            }}
            autoFocus
            onBlur={() => setOpen(false)}
          >
            <option value="">— None —</option>
            {nearbyCircuits.map(c => (
              <option key={c.path} value={c.path}>
                {c.name}{c.path === detected?.path ? ' (auto)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
