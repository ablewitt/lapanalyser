import { create } from 'zustand';
import { fetchUnreadCount } from '../lib/ticketService';

interface UnreadState {
  count: number;
  /** Re-query the unread count from the server. */
  refresh: () => Promise<void>;
}

/**
 * Global unread-ticket-message count. Kept in a store (not local state) so the
 * account menu badge and the ticket threads that mark messages read can share
 * one source of truth.
 */
export const useUnreadStore = create<UnreadState>()((set) => ({
  count: 0,
  refresh: async () => set({ count: await fetchUnreadCount() }),
}));
