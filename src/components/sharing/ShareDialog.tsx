import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ShareDialog.module.css';
import {
  lookupUser, getSessionShares, shareSession, unshareSession, setSessionPublic,
  getTrackConfigShares, shareTrackConfig, unshareTrackConfig, setTrackConfigPublic,
} from '../../lib/sharingService';
import type { ShareTarget } from '../../lib/sharingService';
import { useAuthStore } from '../../store/auth';

interface Props {
  resourceType: 'session' | 'track_config';
  resourceId: string;
  resourceName: string;
  isPublic: boolean;
  onPublicChange: (isPublic: boolean) => void;
  onClose: () => void;
}

export default function ShareDialog({ resourceType, resourceId, resourceName, isPublic: initialIsPublic, onPublicChange, onClose }: Props) {
  const currentUser = useAuthStore(s => s.user);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shares, setShares] = useState<ShareTarget[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<ShareTarget | 'not_found' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);

  const getShares = resourceType === 'session' ? getSessionShares : getTrackConfigShares;
  const doShare = resourceType === 'session' ? shareSession : shareTrackConfig;
  const doUnshare = resourceType === 'session' ? unshareSession : unshareTrackConfig;
  const doSetPublic = resourceType === 'session' ? setSessionPublic : setTrackConfigPublic;

  useEffect(() => {
    getShares(resourceId)
      .then(setShares)
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [resourceId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleFind(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setFound(null);
    const result = await lookupUser(query.trim());
    if (!result || result.userId === currentUser?.id) {
      setFound('not_found');
    } else if (shares.some(s => s.userId === result.userId)) {
      setFound('not_found'); // already shared
    } else {
      setFound(result);
    }
    setIsSearching(false);
  }

  async function handleAdd() {
    if (!found || found === 'not_found') return;
    setBusyId(found.userId);
    try {
      await doShare(resourceId, found.userId);
      setShares(prev => [...prev, found as ShareTarget]);
      setFound(null);
      setQuery('');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(target: ShareTarget) {
    setBusyId(target.userId);
    try {
      await doUnshare(resourceId, target.userId);
      setShares(prev => prev.filter(s => s.userId !== target.userId));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePublic() {
    setIsTogglingPublic(true);
    const next = !isPublic;
    try {
      await doSetPublic(resourceId, next);
      setIsPublic(next);
      onPublicChange(next);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsTogglingPublic(false);
    }
  }

  function displayName(t: ShareTarget) {
    return t.username ? `@${t.username}` : `user:${t.userId.slice(0, 8)}`;
  }

  return createPortal(
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span className={styles.title}>Share — {resourceName}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.section}>
          <label className={styles.publicRow}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={handleTogglePublic}
              disabled={isTogglingPublic}
            />
            <span>
              <strong>Make public</strong>
              <span className={styles.hint}> — visible to anyone with an account</span>
            </span>
          </label>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Shared with</div>
          {isFetching ? (
            <div className={styles.dim}>Loading…</div>
          ) : shares.length === 0 ? (
            <div className={styles.dim}>Not shared with anyone yet.</div>
          ) : (
            <ul className={styles.shareList}>
              {shares.map(t => (
                <li key={t.userId} className={styles.shareRow}>
                  <span>{displayName(t)}</span>
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemove(t)}
                    disabled={busyId === t.userId}
                  >Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Add person</div>
          <form className={styles.findRow} onSubmit={handleFind}>
            <input
              className={styles.findInput}
              placeholder="Username or email…"
              value={query}
              onChange={e => { setQuery(e.target.value); setFound(null); }}
            />
            <button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? '…' : 'Find'}
            </button>
          </form>
          {found === 'not_found' && (
            <div className={styles.notFound}>User not found or already shared.</div>
          )}
          {found && found !== 'not_found' && (
            <div className={styles.foundRow}>
              <span>{displayName(found)}</span>
              <button onClick={handleAdd} disabled={busyId === found.userId}>Add</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
