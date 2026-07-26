import type { ReactNode } from 'react';
import styles from './MainArea.module.css';
import { useUiStore, type ActiveTab } from '../../store/ui';

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'chart', label: 'Chart' },
  { id: 'map', label: 'Map' },
  { id: 'table', label: 'Table' },
];

export default function MainArea({ children, headerRight }: { children: ReactNode; headerRight?: ReactNode }) {
  const { activeTab, setActiveTab } = useUiStore();
  return (
    <main className={styles.main}>
      <nav className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={activeTab === t.id ? 'active' : ''}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        {headerRight && <div className={styles.headerRight}>{headerRight}</div>}
      </nav>
      <div className={styles.content}>{children}</div>
    </main>
  );
}
