import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { isUsernameAvailable } from '../../lib/profileService';
import Logo from '../brand/Logo';
import styles from './AuthPage.module.css';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export default function AuthPage() {
  const { signIn, signUp } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce username availability check
  useEffect(() => {
    if (mode !== 'signup' || !username) { setAvailability('idle'); return; }
    if (!USERNAME_RE.test(username)) { setAvailability('invalid'); return; }
    setAvailability('checking');
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      const free = await isUsernameAvailable(username);
      setAvailability(free ? 'available' : 'taken');
    }, 500);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [username, mode]);

  function switchMode(next: 'signin' | 'signup') {
    setMode(next);
    setError(null);
    setSuccessMsg(null);
    setUsername('');
    setAvailability('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!USERNAME_RE.test(username)) {
        setError('Username must be 3–30 characters: letters, numbers, underscores only.');
        return;
      }
      if (availability === 'taken') {
        setError('That username is already taken.');
        return;
      }
    }

    setBusy(true);
    if (mode === 'signin') {
      const err = await signIn(email, password);
      if (err) setError(err);
      else navigate('/app', { replace: true });
    } else {
      const err = await signUp(email, password, username);
      if (err) {
        setError(err);
      } else {
        setSuccessMsg('Check your email to confirm your account, then sign in.');
        switchMode('signin');
      }
    }
    setBusy(false);
  }

  const availabilityHint: Record<Availability, { text: string; color: string } | null> = {
    idle: null,
    checking: { text: 'Checking…', color: 'var(--text-dim)' },
    available: { text: 'Available', color: 'var(--success)' },
    taken: { text: 'Already taken', color: 'var(--danger)' },
    invalid: { text: '3–30 chars, letters/numbers/underscore only', color: 'var(--text-dim)' },
  };
  const hint = mode === 'signup' ? availabilityHint[availability] : null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.title} style={{ display: 'inline-block' }} aria-label="LapAnalyser home"><Logo size={22} /></Link>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {mode === 'signup' && (
            <div className={styles.field}>
              <label htmlFor="username">
                Username
                {hint && <span style={{ marginLeft: 8, color: hint.color, fontWeight: 400 }}>{hint.text}</span>}
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                placeholder="letters, numbers, underscores"
              />
            </div>
          )}
          <button type="submit" className={styles.submit} disabled={busy || (mode === 'signup' && availability === 'taken')}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          {error && <div className={styles.error}>{error}</div>}
          {successMsg && <div className={styles.success}>{successMsg}</div>}
        </form>
        <div className={styles.toggle}>
          {mode === 'signin' ? (
            <>No account?<button type="button" onClick={() => switchMode('signup')}>Sign up</button></>
          ) : (
            <>Already have an account?<button type="button" onClick={() => switchMode('signin')}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
