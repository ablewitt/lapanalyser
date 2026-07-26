import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../../store/auth';
import {
  fetchAllTickets, fetchTicketMessages, addTicketMessage, updateTicketStatus,
  fetchUsernames, TICKET_STATUSES,
} from '../../../lib/ticketService';
import type { TicketRow, TicketMessageRow, TicketStatus } from '../../../lib/ticketService';
import styles from '../AdminLayout.module.css';

export default function TicketsPanel() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string | null>>({});
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const rows = await fetchAllTickets(statusFilter || undefined);
      setTickets(rows);
      setUsernames(await fetchUsernames([...new Set(rows.map(r => r.user_id))]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    }
  }, [statusFilter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const nameOf = (id: string) => usernames[id] ?? id.slice(0, 8);

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
              onClick={() => setSelected(t)}
            >
              <div className={styles.ticketRowTop}>
                <span className={styles.ticketSubject}>{t.subject}</span>
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
  ticket, authorId, onStatusChange,
}: {
  ticket: TicketRow;
  authorId: string;
  onStatusChange: (t: TicketRow, s: TicketStatus) => void;
}) {
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setMessages(await fetchTicketMessages(ticket.id));
  }, [ticket.id]);

  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await addTicketMessage(ticket.id, authorId, reply.trim(), internal);
      setReply('');
      setInternal(false);
      await load();
    } finally {
      setSending(false);
    }
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

      <div className={styles.messages}>
        {messages.map(m => (
          <div key={m.id} className={`${styles.message} ${m.is_internal ? styles.messageInternal : ''}`}>
            {m.is_internal && <span className={styles.internalTag}>Internal note</span>}
            <div className={styles.messageBody}>{m.body}</div>
            <div className={styles.messageTime}>{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className={styles.replyBox}>
        <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" />
        <div className={styles.replyActions}>
          <label className={styles.internalToggle}>
            <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />
            Internal note (hidden from user)
          </label>
          <button onClick={send} disabled={sending || !reply.trim()}>{sending ? 'Sending…' : 'Reply'}</button>
        </div>
      </div>
    </>
  );
}
