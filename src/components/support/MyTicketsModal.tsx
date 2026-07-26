import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/auth';
import {
  fetchMyTickets, fetchTicketMessages, addTicketMessage,
} from '../../lib/ticketService';
import type { TicketRow, TicketMessageRow } from '../../lib/ticketService';
import styles from './MyTicketsModal.module.css';

/**
 * User-facing view of their own support tickets and our replies. Internal
 * admin notes are filtered out by RLS, so everything fetched here is safe to
 * show. Users can reply to add information; status/priority are admin-only.
 */
export default function MyTicketsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTickets()
      .then(setTickets)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load tickets'));
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Support tickets<span className={styles.count}>{tickets.length}</span></span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.body}>
          <div className={styles.list}>
            {tickets.length === 0 && <div className={styles.muted}>No tickets yet. Raise one from the Support page.</div>}
            {tickets.map(t => (
              <button
                key={t.id}
                className={`${styles.row} ${selected?.id === t.id ? styles.rowActive : ''}`}
                onClick={() => setSelected(t)}
              >
                <span className={styles.subject}>{t.subject}</span>
                <span className={styles.status}>{t.status.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
          <div className={styles.detail}>
            {selected
              ? <Thread key={selected.id} ticket={selected} authorId={user!.id} />
              : <div className={styles.muted}>Select a ticket to view the conversation.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Thread({ ticket, authorId }: { ticket: TicketRow; authorId: string }) {
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setMessages(await fetchTicketMessages(ticket.id));
  }, [ticket.id]);

  useEffect(() => { load(); }, [load]);

  const closed = ticket.status === 'closed';

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await addTicketMessage(ticket.id, authorId, reply.trim());
      setReply('');
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <h3 className={styles.threadSubject}>{ticket.subject}</h3>
      <div className={styles.messages}>
        {messages.map(m => (
          <div key={m.id} className={`${styles.message} ${m.author_id === authorId ? styles.mine : styles.theirs}`}>
            <div className={styles.messageBody}>{m.body}</div>
            <div className={styles.messageTime}>{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      {closed ? (
        <div className={styles.muted}>This ticket is closed.</div>
      ) : (
        <div className={styles.replyBox}>
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Add a reply…" />
          <button onClick={send} disabled={sending || !reply.trim()}>{sending ? 'Sending…' : 'Reply'}</button>
        </div>
      )}
    </>
  );
}
