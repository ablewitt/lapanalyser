import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSessionsByIds } from '../../lib/sessionService';
import type { DbSessionRow } from '../../lib/sessionService';
import styles from './SessionRef.module.css';

/**
 * Shows the session a ticket references and offers to open it in the app.
 * The row is fetched under the viewer's RLS (owner, or admin via bypass); if
 * it's not visible or was deleted, we render nothing.
 */
export default function SessionRef({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<DbSessionRow | null>(null);

  useEffect(() => {
    fetchSessionsByIds([sessionId]).then(rows => setSession(rows[0] ?? null)).catch(() => setSession(null));
  }, [sessionId]);

  if (!session) return null;

  return (
    <div className={styles.ref}>
      <span className={styles.icon} aria-hidden>📁</span>
      <div className={styles.meta}>
        <div className={styles.name}>{session.display_name || session.filename}</div>
        <div className={styles.sub}>
          {session.circuit_name || session.venue_raw || 'Session'}
          {session.date_recorded ? ` · ${new Date(session.date_recorded).toLocaleDateString()}` : ''}
        </div>
      </div>
      <button className={styles.openBtn} onClick={() => navigate(`/app?openSession=${session.id}`)}>
        Open
      </button>
    </div>
  );
}
