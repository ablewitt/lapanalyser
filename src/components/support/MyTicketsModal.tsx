import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/auth';
import {
  fetchMyTickets, createTicket, addTicketMessage, uploadTicketAttachment, addSessionReference,
  TICKET_CATEGORIES,
} from '../../lib/ticketService';
import type { TicketRow, TicketCategory } from '../../lib/ticketService';
import { fetchUserSessions } from '../../lib/sessionService';
import type { DbSessionRow } from '../../lib/sessionService';
import { useTicketMessages } from '../../hooks/useTicketMessages';
import SessionRef from './SessionRef';
import MessageAttachments from './MessageAttachments';
import ReplyComposer from './ReplyComposer';
import ImageAttachField from './ImageAttachField';
import styles from './MyTicketsModal.module.css';

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Bug / something broke',
  feature: 'Feature request',
  account: 'Account & billing',
  data: 'Data / lap detection',
  other: 'Something else',
};

/**
 * User-facing view of their own support tickets and our replies, plus a form to
 * raise new ones. Internal admin notes are filtered out by RLS, so everything
 * fetched here is safe to show. Status/priority are admin-only.
 */
export default function MyTicketsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [sessions, setSessions] = useState<DbSessionRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTickets()
      .then(setTickets)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load tickets'));
    fetchUserSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  function onCreated(ticket: TicketRow) {
    setTickets(prev => [ticket, ...prev]);
    setSelected(ticket);
    setCreating(false);
  }

  // Portal to <body> so Leaflet's map controls/attribution (rendered inside the
  // stacking context of the tab bar this modal is triggered from) can't paint
  // over it.
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Support tickets<span className={styles.count}>{tickets.length}</span></span>
          <div className={styles.headerActions}>
            <button onClick={() => { setCreating(true); setSelected(null); }}>+ New ticket</button>
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.body}>
          <div className={styles.list}>
            {tickets.length === 0 && <div className={styles.muted}>No tickets yet.</div>}
            {tickets.map(t => (
              <button
                key={t.id}
                className={`${styles.row} ${selected?.id === t.id ? styles.rowActive : ''}`}
                onClick={() => { setSelected(t); setCreating(false); }}
              >
                <span className={styles.subject}>{t.subject}</span>
                <span className={styles.status}>{t.status.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
          <div className={styles.detail}>
            {creating
              ? <NewTicketForm userId={user!.id} sessions={sessions} onCreated={onCreated} onCancel={() => setCreating(false)} />
              : selected
                ? <Thread key={selected.id} ticket={selected} authorId={user!.id} sessions={sessions} />
                : <div className={styles.muted}>Select a ticket, or start a new one.</div>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NewTicketForm({
  userId, sessions, onCreated, onCancel,
}: {
  userId: string;
  sessions: DbSessionRow[];
  onCreated: (t: TicketRow) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await createTicket(userId, subject.trim(), category, message.trim(), sessionId || null, files);
      onCreated(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.newForm} onSubmit={submit}>
      <h3 className={styles.threadSubject}>New ticket</h3>
      <label className={styles.field}>
        <span>Subject</span>
        <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Category</span>
        <select value={category} onChange={e => setCategory(e.target.value as TicketCategory)}>
          {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
      </label>
      {sessions.length > 0 && (
        <label className={styles.field}>
          <span>Related session (optional)</span>
          <select value={sessionId} onChange={e => setSessionId(e.target.value)}>
            <option value="">— none —</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{(s.display_name || s.filename)}{s.circuit_name ? ` · ${s.circuit_name}` : ''}</option>
            ))}
          </select>
        </label>
      )}
      <label className={styles.field}>
        <span>How can we help?</span>
        <textarea required value={message} onChange={e => setMessage(e.target.value)} />
      </label>
      <div className={styles.field}>
        <span>Screenshots (optional)</span>
        <ImageAttachField files={files} onChange={setFiles} />
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.newFormActions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit ticket'}</button>
      </div>
    </form>
  );
}

function Thread({ ticket, authorId, sessions }: { ticket: TicketRow; authorId: string; sessions: DbSessionRow[] }) {
  const { messages, attachments, reload } = useTicketMessages(ticket.id);

  const closed = ticket.status === 'closed';

  async function send(text: string, files: File[], sessionIds: string[]) {
    const msg = await addTicketMessage(ticket.id, authorId, text);
    for (const file of files) await uploadTicketAttachment(ticket.id, msg.id, authorId, file);
    for (const sid of sessionIds) await addSessionReference(ticket.id, msg.id, authorId, sid);
    await reload();
  }

  return (
    <>
      <h3 className={styles.threadSubject}>{ticket.subject}</h3>
      {ticket.session_id && <SessionRef sessionId={ticket.session_id} />}
      <div className={styles.messages}>
        {messages.map(m => (
          <div key={m.id} className={`${styles.message} ${m.author_id === authorId ? styles.mine : styles.theirs}`}>
            <div className={styles.messageFrom}>{m.author_id === authorId ? 'You' : 'Support'}</div>
            {m.body && <div className={styles.messageBody}>{m.body}</div>}
            <MessageAttachments attachments={attachments[m.id]} />
            <div className={styles.messageTime}>{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      {closed
        ? <div className={styles.muted}>This ticket is closed.</div>
        : <ReplyComposer onSend={send} placeholder="Add a reply…" sessions={sessions} />}
    </>
  );
}
