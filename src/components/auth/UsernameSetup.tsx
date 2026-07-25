import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { isUsernameAvailable, updateUsername } from '../../lib/profileService';
import styles from './AuthPage.module.css';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function UsernameSetup() {
  const { signOut, setProfile, profile, user } = useAuthStore();
  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username) { setAvailability('idle'); return; }
    if (!USERNAME_RE.test(username)) { setAvailability('invalid'); return; }
    setAvailability('checking');
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      const free = await isUsernameAvailable(username);
      setAvailability(free ? 'available' : 'taken');
    }, 500);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!USERNAME_RE.test(username) || availability !== 'available') return;
    setBusy(true);
    const err = await updateUsername(user!.id, username);
    if (err) {
      setError(err);
      setBusy(false);
    } else {
      setProfile({ ...profile!, username });
    }
  }

  const hintMap: Record<Availability, { text: string; color: string } | null> = {
    idle: null,
    checking: { text: 'Checking…', color: 'var(--text-dim)' },
    available: { text: 'Available', color: 'var(--success)' },
    taken: { text: 'Already taken', color: 'var(--danger)' },
    invalid: { text: '3–30 chars, letters/numbers/underscore only', color: 'var(--text-dim)' },
  };
  const hint = hintMap[availability];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.title}>Choose a username</div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>
          Your username is how other users find and share with you. It can be changed later.
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="username">
              Username
              {hint && <span style={{ marginLeft: 8, color: hint.color, fontWeight: 400 }}>{hint.text}</span>}
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              placeholder="letters, numbers, underscores"
            />
          </div>
          <button
            type="submit"
            className={styles.submit}
            disabled={busy || availability !== 'available'}
          >
            {busy ? 'Saving…' : 'Continue'}
          </button>
          {error && <div className={styles.error}>{error}</div>}
        </form>
        <div className={styles.toggle}>
          <button type="button" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
