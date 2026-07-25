import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import styles from './public.module.css';

interface PublicHeaderProps {
  /** Show in-page section anchors (only valid on the landing page). */
  sections?: boolean;
}

export default function PublicHeader({ sections = false }: PublicHeaderProps) {
  return (
    <nav className={styles.nav}>
      <div className={`${styles.wrap} ${styles.navInner}`}>
        <Link to="/" aria-label="LapAnalyser home"><Logo size={24} /></Link>
        <div className={styles.navLinks}>
          {sections && <a className={styles.navLink} href="#disciplines">Disciplines</a>}
          {sections && <a className={styles.navLink} href="#features">Features</a>}
          <Link className={styles.navLink} to="/docs">Docs</Link>
          <Link className={styles.navLink} to="/support">Support</Link>
          <Link className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} to="/auth">Log in</Link>
          <Link className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} to="/auth?mode=signup">Start free</Link>
        </div>
      </div>
    </nav>
  );
}
