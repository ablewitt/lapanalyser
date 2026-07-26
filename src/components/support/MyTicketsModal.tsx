import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { fetchMyTickets, addTicketMessage, uploadTicketAttachment } from '../../lib/ticketService';
import type { TicketRow } from '../../lib/ticketService';
import { useTicketMessages } from '../../hooks/useTicketMessages';
import SessionRef from './SessionRef';
import MessageAttachments from './MessageAttachments';
import ReplyComposer from './ReplyComposer';
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
  const { messages, attachments, reload } = useTicketMessages(ticket.id);

  const closed = ticket.status === 'closed';

  async function send(text: string, files: File[]) {
    const msg = await addTicketMessage(ticket.id, authorId, text);
    for (const file of files) await uploadTicketAttachment(ticket.id, msg.id, authorId, file);
    await reload();
  }

  return (
    <>
      <h3 className={styles.threadSubject}>{ticket.subject}</h3>
      {ticket.session_id && <SessionRef sessionId={ticket.session_id} />}
      <div className={styles.messages}>
        {messages.map(m => (
          <div key={m.id} className={`${styles.message} ${m.author_id === authorId ? styles.mine : styles.theirs}`}>
            {m.body && <div className={styles.messageBody}>{m.body}</div>}
            <MessageAttachments attachments={attachments[m.id]} />
            <div className={styles.messageTime}>{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      {closed
        ? <div className={styles.muted}>This ticket is closed.</div>
        : <ReplyComposer onSend={send} placeholder="Add a reply…" />}
    </>
  );
}
