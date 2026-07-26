import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Logo from '../brand/Logo';
import { ADMIN_MODULES } from './registry';
import styles from './AdminLayout.module.css';

/**
 * The /admin shell. Nav and nested routes are both derived from ADMIN_MODULES,
 * so a new admin section only needs a registry entry. Route access is already
 * gated by AdminRoute in App.tsx (admin role required); this is presentation.
 */
export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo size={20} />
          <span className={styles.brandTag}>Admin</span>
        </div>
        <nav className={styles.nav}>
          {ADMIN_MODULES.map(m => (
            <NavLink
              key={m.path}
              to={m.path === '' ? '/admin' : `/admin/${m.path}`}
              end={m.path === ''}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <span aria-hidden>{m.icon}</span>
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
