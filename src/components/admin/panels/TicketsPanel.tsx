import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../../store/auth';
import {
  fetchAllTickets, addTicketMessage, uploadTicketAttachment, addSessionReference,
  updateTicketStatus, fetchUsernames, fetchUnreadTicketIds, subscribeToNewTicketMessages,
  TICKET_STATUSES,
} from '../../../lib/ticketService';
import type { TicketRow, TicketStatus } from '../../../lib/ticketService';
import { useTicketMessages } from '../../../hooks/useTicketMessages';
import SessionRef from '../../support/SessionRef';
import MessageAttachments from '../../support/MessageAttachments';
import ReplyComposer from '../../support/ReplyComposer';
import styles from '../AdminLayout.module.css';

export default function TicketsPanel() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string | null>>({});
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const rows = await fetchAllTickets(statusFilter || undefined);
      setTickets(rows);
      const ownerIds = rows.map(r => r.user_id).filter((id): id is string => !!id);
      setUsernames(await fetchUsernames([...new Set(ownerIds)]));
      setUnreadIds(new Set(await fetchUnreadTicketIds()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    }
  }, [statusFilter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // The admin page doesn't mount the app's UserMenu subscription, so refresh
  // the list and unread markers here when any ticket message comes in.
  useEffect(() => subscribeToNewTicketMessages(() => loadTickets()), [loadTickets]);

  const nameOf = (id: string | null) => (id ? usernames[id] ?? id.slice(0, 8) : '(deleted user)');

  // Opening a ticket marks it read (via useTicketMessages); clear its dot now
  // for instant feedback rather than waiting on the round-trip.
  function selectTicket(ticket: TicketRow) {
    setSelected(ticket);
    setUnreadIds(prev => {
      if (!prev.has(ticket.id)) return prev;
      const next = new Set(prev);
      next.delete(ticket.id);
      return next;
    });
  }

  async function handleStatusChange(ticket: TicketRow, status: TicketStatus) {
    await updateTicketStatus(ticket.id, status);
    setSelected(s => (s && s.id === ticket.id ? { ...s, status } : s));
    loadTickets();
  }

  return (
    <div>
      <h1 className={styles.panelTitle}>Support tickets</h1>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.ticketFilters}>
        <button className={statusFilter === '' ? styles.filterActive : ''} onClick={() => setStatusFilter('')}>All</button>
        {TICKET_STATUSES.map(s => (
          <button key={s} className={statusFilter === s ? styles.filterActive : ''} onClick={() => setStatusFilter(s)}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className={styles.ticketLayout}>
        <div className={styles.ticketList}>
          {tickets.length === 0 && <div className={styles.muted}>No tickets.</div>}
          {tickets.map(t => (
            <button
              key={t.id}
              className={`${styles.ticketRow} ${selected?.id === t.id ? styles.ticketRowActive : ''}`}
              onClick={() => selectTicket(t)}
            >
              <div className={styles.ticketRowTop}>
                <span className={styles.ticketSubject}>
                  {unreadIds.has(t.id) && <span className={styles.unreadDot} aria-label="Unread messages" />}
                  {t.subject}
                </span>
                <span className={`${styles.badge} ${styles[`status_${t.status}`]}`}>{t.status.replace('_', ' ')}</span>
              </div>
              <div className={styles.ticketMeta}>{nameOf(t.user_id)} · {t.category}</div>
            </button>
          ))}
        </div>

        <div className={styles.ticketDetail}>
          {selected ? (
            <TicketThread
              key={selected.id}
              ticket={selected}
              authorId={user!.id}
              ownerName={nameOf(selected.user_id)}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className={styles.muted}>Select a ticket to view the thread.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketThread({
  ticket, authorId, ownerName, onStatusChange,
}: {
  ticket: TicketRow;
  authorId: string;
  ownerName: string;
  onStatusChange: (t: TicketRow, s: TicketStatus) => void;
}) {
  const { messages, attachments, reload } = useTicketMessages(ticket.id);
  const [internal, setInternal] = useState(false);

  async function send(text: string, files: File[], sessionIds: string[]) {
    const msg = await addTicketMessage(ticket.id, authorId, text, internal);
    for (const file of files) await uploadTicketAttachment(ticket.id, msg.id, authorId, file);
    for (const sid of sessionIds) await addSessionReference(ticket.id, msg.id, authorId, sid);
    setInternal(false);
    await reload();
  }

  return (
    <>
      <div className={styles.threadHeader}>
        <div>
          <h2 className={styles.threadSubject}>{ticket.subject}</h2>
          <div className={styles.ticketMeta}>{ticket.category} · priority {ticket.priority}</div>
        </div>
        <select value={ticket.status} onChange={e => onStatusChange(ticket, e.target.value as TicketStatus)}>
          {TICKET_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {ticket.session_id && <SessionRef sessionId={ticket.session_id} />}

      <div className={styles.messages}>
        {messages.map(m => {
          const fromOwner = m.author_id === ticket.user_id;
          const cls = m.is_internal ? styles.messageInternal : fromOwner ? styles.fromUser : styles.fromStaff;
          const who = m.is_internal ? 'Internal note' : fromOwner ? ownerName : (m.author_id === authorId ? 'You' : 'Support');
          return (
            <div key={m.id} className={`${styles.message} ${cls}`}>
              <div className={styles.messageFrom}>{who}</div>
              {m.body && <div className={styles.messageBody}>{m.body}</div>}
              <MessageAttachments attachments={attachments[m.id]} />
              <div className={styles.messageTime}>{new Date(m.created_at).toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      <ReplyComposer
        onSend={send}
        extraControls={
          <label className={styles.internalToggle}>
            <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />
            Internal note
          </label>
        }
      />
    </>
  );
}
