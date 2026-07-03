import { useSelectionStore, type ComparisonMode } from '../../store/selection';
import styles from './ComparisonModeToggle.module.css';

export default function ComparisonModeToggle() {
  const { comparisonMode, setComparisonMode } = useSelectionStore();
  const toggle = (m: ComparisonMode) => setComparisonMode(m);
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Compare by</span>
      <button
        className={comparisonMode === 'distance' ? 'active' : ''}
        onClick={() => toggle('distance')}
      >
        Distance
      </button>
      <button
        className={comparisonMode === 'time' ? 'active' : ''}
        onClick={() => toggle('time')}
      >
        Time
      </button>
    </div>
  );
}
