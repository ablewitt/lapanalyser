import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useUnreadStore } from '../../store/unread';
import { subscribeToNewTicketMessages } from '../../lib/ticketService';
import MyTicketsModal from '../support/MyTicketsModal';
import styles from './UserMenu.module.css';

/**
 * Top-right account dropdown: Admin (admins only) + Sign out. Keeps these
 * controls out of the crowded sidebar header and scales as more account
 * actions are added.
 */
export default function UserMenu() {
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = useUnreadStore(s => s.count);
  const refreshUnread = useUnreadStore(s => s.refresh);

  // Seed the unread badge and keep it live: any new ticket message the user is
  // allowed to see re-queries the count (reading a thread clears it elsewhere).
  useEffect(() => {
    refreshUnread();
    return subscribeToNewTicketMessages(() => refreshUnread());
  }, [refreshUnread]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = profile?.username ?? user?.email ?? 'Account';
  const initial = label.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className={styles.root} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user?.email}
      >
        <span className={styles.avatar} aria-hidden>
          {initial}
          {unread > 0 && <span className={styles.dot} aria-label={`${unread} unread messages`} />}
        </span>
        <span className={styles.label}>{label}</span>
        <span aria-hidden className={styles.caret}>▾</span>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <button
            className={styles.item}
            role="menuitem"
            onClick={() => { setOpen(false); setTicketsOpen(true); }}
          >
            Support
            {unread > 0 && <span className={styles.badge}>{unread}</span>}
          </button>
          {profile?.role === 'admin' && (
            <button
              className={styles.item}
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/admin'); }}
            >
              Admin
            </button>
          )}
          <button
            className={styles.item}
            role="menuitem"
            onClick={() => { setOpen(false); signOut(); }}
          >
            Sign out
          </button>
        </div>
      )}

      {ticketsOpen && <MyTicketsModal onClose={() => setTicketsOpen(false)} />}
    </div>
  );
}
