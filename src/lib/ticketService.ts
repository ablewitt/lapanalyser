import { supabase } from './supabase';
import type { Database } from './database.types';

export type TicketRow = Database['public']['Tables']['support_tickets']['Row'];
export type TicketMessageRow = Database['public']['Tables']['support_messages']['Row'];
export type TicketCategory = TicketRow['category'];
export type TicketStatus = TicketRow['status'];

export const TICKET_CATEGORIES: TicketCategory[] = ['bug', 'feature', 'account', 'data', 'other'];
export const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

/**
 * Create a ticket plus its opening message. The message carries the body so the
 * ticket row stays metadata-only and the thread is uniform (opening message +
 * replies all live in support_messages).
 */
export async function createTicket(
  userId: string,
  subject: string,
  category: TicketCategory,
  body: string,
  sessionId?: string | null,
): Promise<TicketRow> {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: userId, subject, category, session_id: sessionId ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { error: msgError } = await supabase
    .from('support_messages')
    .insert({ ticket_id: data.id, author_id: userId, body });
  if (msgError) throw new Error(msgError.message);

  return data;
}

/** Tickets for the current user (RLS restricts to their own). */
export async function fetchMyTickets(): Promise<TicketRow[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** All tickets — admin only (RLS admin-bypass). Optional status filter. */
export async function fetchAllTickets(status?: TicketStatus): Promise<TicketRow[]> {
  let query = supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchTicketMessages(ticketId: string): Promise<TicketMessageRow[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addTicketMessage(
  ticketId: string,
  authorId: string,
  body: string,
  isInternal = false,
): Promise<TicketMessageRow> {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id: ticketId, author_id: authorId, body, is_internal: isInternal })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status })
    .eq('id', ticketId);
  if (error) throw new Error(error.message);
}

/**
 * Subscribe to new messages on a ticket. Fires onInsert with each inserted row
 * the caller is permitted to see (Realtime enforces RLS, so internal notes never
 * reach a non-admin subscriber). Returns an unsubscribe function.
 */
export function subscribeToTicketMessages(
  ticketId: string,
  onInsert: (message: TicketMessageRow) => void,
): () => void {
  const channel = supabase
    .channel(`ticket-messages-${ticketId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
      payload => onInsert(payload.new as TicketMessageRow),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

/**
 * Subscribe to every new ticket message the caller can see (no ticket filter).
 * Used to keep the global unread indicator fresh. Returns an unsubscribe fn.
 */
export function subscribeToNewTicketMessages(
  onInsert: (message: TicketMessageRow) => void,
): () => void {
  const channel = supabase
    .channel('ticket-messages-all')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_messages' },
      payload => onInsert(payload.new as TicketMessageRow),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

/** Count of messages the current user hasn't seen (RLS-scoped). */
export async function fetchUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc('unread_message_count');
  if (error) return 0;
  return data ?? 0;
}

/** Ids of tickets with messages the current user hasn't seen (RLS-scoped). */
export async function fetchUnreadTicketIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc('unread_ticket_ids');
  if (error) return [];
  return data ?? [];
}

/** Mark a ticket read up to now for the given user. Best-effort. */
export async function markTicketRead(userId: string, ticketId: string): Promise<void> {
  await supabase
    .from('ticket_reads')
    .upsert(
      { user_id: userId, ticket_id: ticketId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,ticket_id' },
    );
}

/** Resolve author user_ids to usernames for display (admin ticket views). */
export async function fetchUsernames(userIds: string[]): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);
  return Object.fromEntries((data ?? []).map(p => [p.id, p.username ?? null]));
}
