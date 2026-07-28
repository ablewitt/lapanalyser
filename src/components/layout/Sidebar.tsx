import type { ReactNode } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  children: ReactNode;
  /** Mobile drawer open state (ignored on desktop, where the rail is fixed). */
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ children, open = false, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>{children}</aside>
    </>
  );
}
