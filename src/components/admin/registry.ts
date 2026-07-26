import type { ComponentType } from 'react';
import DashboardPanel from './panels/DashboardPanel';
import TicketsPanel from './panels/TicketsPanel';
import UsersPanel from './panels/UsersPanel';
import SessionsPanel from './panels/SessionsPanel';
import AuditPanel from './panels/AuditPanel';

/**
 * A self-contained admin section. Adding a feature to the admin panel means
 * appending one entry here — the layout builds its nav and routes from this
 * list. Mirrors the parser registry pattern in src/parsers/registry.ts.
 */
export interface AdminModule {
  /** URL segment under /admin (e.g. '' for the index, 'users' for /admin/users). */
  path: string;
  /** Sidebar label. */
  label: string;
  /** Small emoji/icon shown beside the label. */
  icon: string;
  component: ComponentType;
}

export const ADMIN_MODULES: AdminModule[] = [
  { path: '', label: 'Dashboard', icon: '📊', component: DashboardPanel },
  { path: 'users', label: 'Users', icon: '👥', component: UsersPanel },
  { path: 'sessions', label: 'Sessions', icon: '📁', component: SessionsPanel },
  { path: 'tickets', label: 'Support', icon: '🎫', component: TicketsPanel },
  { path: 'audit', label: 'Audit log', icon: '📜', component: AuditPanel },
  // Later phases register here: analytics.
];
