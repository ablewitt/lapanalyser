import { useEffect, useState, useCallback } from 'react';
import {
  fetchTicketMessages, fetchTicketAttachments, subscribeToTicketMessages, markTicketRead,
} from '../lib/ticketService';
import type { TicketMessageRow, TicketAttachmentRow } from '../lib/ticketService';
import { useAuthStore } from '../store/auth';
import { useUnreadStore } from '../store/unread';

/**
 * Loads a ticket's messages (with their image attachments, grouped by message
 * id) and keeps them live via Realtime. New inserts are appended (deduped by
 * id). Opening a thread — and receiving someone else's message while it's open
 * — marks the ticket read and refreshes the global unread badge. `reload`
 * re-fetches on demand (e.g. after sending with attachments).
 */
export function useTicketMessages(ticketId: string) {
  const userId = useAuthStore(s => s.user?.id) ?? null;
  const refreshUnread = useUnreadStore(s => s.refresh);
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [attachments, setAttachments] = useState<Record<string, TicketAttachmentRow[]>>({});

  const loadAttachments = useCallback(async () => {
    const rows = await fetchTicketAttachments(ticketId);
    const grouped: Record<string, TicketAttachmentRow[]> = {};
    for (const a of rows) (grouped[a.message_id] ??= []).push(a);
    setAttachments(grouped);
  }, [ticketId]);

  const reload = useCallback(async () => {
    setMessages(await fetchTicketMessages(ticketId));
    await loadAttachments();
  }, [ticketId, loadAttachments]);

  const markRead = useCallback(() => {
    if (!userId) return;
    markTicketRead(userId, ticketId).then(refreshUnread).catch(() => {});
  }, [userId, ticketId, refreshUnread]);

  useEffect(() => {
    reload().then(markRead);
    const unsubscribe = subscribeToTicketMessages(ticketId, msg => {
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
      loadAttachments();
      if (msg.author_id !== userId) markRead();
    });
    return unsubscribe;
  }, [ticketId, reload, loadAttachments, markRead, userId]);

  return { messages, attachments, reload };
}
