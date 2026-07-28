import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Logo from '../brand/Logo';
import { ADMIN_MODULES } from './registry';
import AdminIcon from './AdminIcons';
import styles from './AdminLayout.module.css';

/**
 * The /admin shell. Nav and nested routes are both derived from ADMIN_MODULES,
 * so a new admin section only needs a registry entry. Route access is already
 * gated by AdminRoute in App.tsx (admin role required); this is presentation.
 *
 * On desktop the sidebar is a fixed rail. On mobile it collapses behind a
 * hamburger in a top bar and slides in as an off-canvas drawer over a backdrop,
 * so the nav never steals the narrow viewport from the content.
 */
export default function AdminLayout() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  // Close the drawer on Escape (mobile).
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div className={styles.root}>
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={`${styles.navToggle} ${navOpen ? styles.navToggleActive : ''}`}
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen(v => !v)}
        >
          <span className={styles.navToggleBar} />
          <span className={styles.navToggleBar} />
          <span className={styles.navToggleBar} />
        </button>
        <div className={styles.brand}>
          <Logo size={18} />
          <span className={styles.brandTag}><span className={styles.pulse} aria-hidden />Admin</span>
        </div>
      </div>

      {navOpen && <div className={styles.backdrop} onClick={closeNav} />}

      <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <Logo size={20} />
          <span className={styles.brandTag}><span className={styles.pulse} aria-hidden />Admin</span>
        </div>
        <nav className={styles.nav}>
          {ADMIN_MODULES.map(m => (
            <NavLink
              key={m.path}
              to={m.path === '' ? '/admin' : `/admin/${m.path}`}
              end={m.path === ''}
              onClick={closeNav}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon} aria-hidden><AdminIcon name={m.path} /></span>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <button className={styles.backBtn} onClick={() => navigate('/app')}>← Back to app</button>
      </aside>

      <main className={styles.content}>
        <Routes>
          {ADMIN_MODULES.map(m => (
            <Route key={m.path} path={m.path} element={<m.component />} />
          ))}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
