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

/** Resolve author user_ids to usernames for display (admin ticket views). */
export async function fetchUsernames(userIds: string[]): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);
  return Object.fromEntries((data ?? []).map(p => [p.id, p.username ?? null]));
}
