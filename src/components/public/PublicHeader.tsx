import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import styles from './public.module.css';

interface PublicHeaderProps {
  /** Show in-page section anchors (only valid on the landing page). */
  sections?: boolean;
}

export default function PublicHeader({ sections = false }: PublicHeaderProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <nav className={styles.nav}>
      <div className={`${styles.wrap} ${styles.navInner}`}>
        <Link to="/" aria-label="LapAnalyser home" onClick={close}><Logo size={24} /></Link>

        <button
          type="button"
          className={`${styles.navToggle} ${open ? styles.navToggleActive : ''}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.navToggleBar} />
          <span className={styles.navToggleBar} />
          <span className={styles.navToggleBar} />
        </button>

        <div className={`${styles.navLinks} ${open ? styles.navLinksOpen : ''}`}>
          {sections && <a className={styles.navLink} href="#disciplines" onClick={close}>Disciplines</a>}
          {sections && <a className={styles.navLink} href="#features" onClick={close}>Features</a>}
          <Link className={styles.navLink} to="/docs" onClick={close}>Docs</Link>
          <Link className={styles.navLink} to="/support" onClick={close}>Support</Link>
          <Link className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} to="/auth" onClick={close}>Log in</Link>
          <Link className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} to="/auth?mode=signup" onClick={close}>Start free</Link>
        </div>
      </div>
    </nav>
  );
}
