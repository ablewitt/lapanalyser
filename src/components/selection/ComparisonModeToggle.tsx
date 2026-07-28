import { useSelectionStore, type ComparisonMode } from '../../store/selection';
import styles from './ComparisonModeToggle.module.css';

export default function ComparisonModeToggle() {
  const { comparisonMode, setComparisonMode } = useSelectionStore();
  const toggle = (m: ComparisonMode) => setComparisonMode(m);
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Compare by</span>
      <div className={styles.seg} role="tablist" aria-label="Compare by">
        <button
          role="tab"
          aria-selected={comparisonMode === 'distance'}
          className={`${styles.segBtn} ${comparisonMode === 'distance' ? styles.segActive : ''}`}
          onClick={() => toggle('distance')}
        >
          Distance
        </button>
        <button
          role="tab"
          aria-selected={comparisonMode === 'time'}
          className={`${styles.segBtn} ${comparisonMode === 'time' ? styles.segActive : ''}`}
          onClick={() => toggle('time')}
        >
          Time
        </button>
      </div>
    </div>
  );
}
