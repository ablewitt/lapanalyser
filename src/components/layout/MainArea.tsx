import type { ReactNode } from 'react';
import styles from './MainArea.module.css';
import { useUiStore, type ActiveTab } from '../../store/ui';

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'chart', label: 'Chart' },
  { id: 'map', label: 'Map' },
  { id: 'table', label: 'Table' },
];

interface MainAreaProps {
  children: ReactNode;
  headerRight?: ReactNode;
  /** When provided, renders a hamburger (mobile only) to open the sidebar drawer. */
  onMenuToggle?: () => void;
}

export default function MainArea({ children, headerRight, onMenuToggle }: MainAreaProps) {
  const { activeTab, setActiveTab } = useUiStore();
  return (
    <main className={styles.main}>
      <nav className={styles.tabs}>
        {onMenuToggle && (
          <button className={styles.menuBtn} aria-label="Open menu" onClick={onMenuToggle}>
            <span className={styles.menuBar} />
            <span className={styles.menuBar} />
            <span className={styles.menuBar} />
          </button>
        )}
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
