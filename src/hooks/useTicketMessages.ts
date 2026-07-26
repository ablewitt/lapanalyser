import { useEffect, useState, useCallback } from 'react';
import { fetchTicketMessages, subscribeToTicketMessages, markTicketRead } from '../lib/ticketService';
import type { TicketMessageRow } from '../lib/ticketService';
import { useAuthStore } from '../store/auth';
import { useUnreadStore } from '../store/unread';

/**
 * Loads a ticket's messages and keeps them live via Realtime. New inserts are
 * appended (deduped by id, so a sender's own optimistic reload doesn't double
 * up when the Realtime echo arrives). Opening a thread — and receiving a
 * message from someone else while it's open — marks the ticket read and
 * refreshes the global unread badge. `reload` re-fetches on demand.
 */
export function useTicketMessages(ticketId: string) {
  const userId = useAuthStore(s => s.user?.id) ?? null;
  const refreshUnread = useUnreadStore(s => s.refresh);
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);

  const reload = useCallback(async () => {
    setMessages(await fetchTicketMessages(ticketId));
  }, [ticketId]);

  const markRead = useCallback(() => {
    if (!userId) return;
    markTicketRead(userId, ticketId).then(refreshUnread).catch(() => {});
  }, [userId, ticketId, refreshUnread]);

  useEffect(() => {
    reload().then(markRead);
    const unsubscribe = subscribeToTicketMessages(ticketId, msg => {
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.author_id !== userId) markRead();
    });
    return unsubscribe;
  }, [ticketId, reload, markRead, userId]);

  return { messages, reload };
}
