import { useEffect, useRef, useState } from 'react';
import styles from '../../App.module.css';
import Logo from '../brand/Logo';
import Sidebar from '../layout/Sidebar';
import MainArea from '../layout/MainArea';
import FileDropzone from '../file/FileDropzone';
import SessionTree from '../file/SessionTree';
import ComparisonModeToggle from '../selection/ComparisonModeToggle';
import GroupBuilder from '../selection/GroupBuilder';
import ChartView from '../chart/ChartView';
import MapView from '../map/MapView';
import TableView from '../table/TableView';
import SessionManager from '../sessions/SessionManager';
import UserMenu from './UserMenu';
import { useUiStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { useSessionsStore } from '../../store/sessions';
import {
  fetchSessionsByIds, downloadSessionContent, rekeySession,
  loadActiveSessionIds, saveActiveSessionIds, pruneInaccessibleIds,
} from '../../lib/sessionService';
import { parseVboContent } from '../../lib/parseWorker';
import { useSettingsSync } from '../../hooks/useSettingsSync';

/**
 * The logged-in application shell (sidebar + charts/map/table). Rendered by the
 * /app route, which guarantees an authenticated user with a username before we
 * get here.
 */
export default function Workspace() {
  useSettingsSync();
  const { activeTab, isLoading, parseWarnings } = useUiStore();
  const clearWarnings = useUiStore(s => s.setParseWarnings);
  const { user, isInitializing } = useAuthStore();
  const { addSession } = useSessionsStore();
  const [managerOpen, setManagerOpen] = useState(false);
  const restoredUserRef = useRef<string | null>(null);

  // Save to sessionStorage whenever sessions change — subscribed at the store
  // level so it fires synchronously on every addSession/removeSession, bypassing
  // React's render cycle and avoiding all timing races.
  useEffect(() => {
    return useSessionsStore.subscribe((state, prev) => {
      if (state.sessions === prev.sessions) return;
      const userId = useAuthStore.getState().user?.id;
      if (userId) saveActiveSessionIds(userId, state.sessions.map(s => s.id));
    });
  }, []);

  // Restore saved sessions once the app is fully initialised (isInitializing=false
  // means a profile load succeeded, proving the Supabase client is authenticated).
  useEffect(() => {
    if (!user || isInitializing) {
      if (!user) restoredUserRef.current = null;
      return;
    }
    if (restoredUserRef.current === user.id) return; // already restored
    restoredUserRef.current = user.id;

    const savedIds = loadActiveSessionIds(user.id);
    if (savedIds.length === 0) return;

    fetchSessionsByIds(savedIds)
      .then(async rows => {
        await Promise.all(rows.map(async (row) => {
          try {
            const content = await downloadSessionContent(row.storage_path);
            const result = await parseVboContent(row.filename, content);
            addSession({ ...rekeySession(result.session, row.id), displayName: row.display_name });
          } catch (e) {
            console.warn('Failed to restore session', row.id, e);
          }
        }));

        // Self-heal: fetchSessionsByIds respects RLS, so any saved id missing
        // from `rows` is no longer accessible — deleted, unshared, or made
        // private again. Prune those so they can't linger and fail on every
        // future refresh. Written after the restores so it wins over the
        // per-add save subscription.
        const healedIds = pruneInaccessibleIds(savedIds, rows.map(r => r.id));
        if (healedIds.length !== savedIds.length) saveActiveSessionIds(user.id, healedIds);
      })
      .catch(err => console.warn('Session restore failed:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isInitializing]);

  if (!user) return null; // guarded by the route; satisfies types

  return (
    <div className={styles.app}>
      <Sidebar>
        <div className={styles.sidebarHeader}>
          <Logo size={20} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isLoading && <span className={styles.loading}>Parsing…</span>}
            <button style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setManagerOpen(true)}>
              Sessions
            </button>
          </div>
        </div>
        <FileDropzone />
        {parseWarnings.length > 0 && (
          <div className={styles.warnings}>
            {parseWarnings.map((w, i) => <div key={i}>{w}</div>)}
            <button style={{ marginTop: 4, fontSize: 11 }} onClick={() => clearWarnings([])}>Dismiss</button>
          </div>
        )}
        <ComparisonModeToggle />
        <SessionTree />
        <GroupBuilder />
      </Sidebar>
      <MainArea headerRight={<UserMenu />}>
        {activeTab === 'chart' && <ChartView />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'table' && <TableView />}
      </MainArea>
      {managerOpen && <SessionManager onClose={() => setManagerOpen(false)} />}
    </div>
  );
}
