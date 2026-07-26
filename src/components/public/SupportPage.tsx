import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import styles from './public.module.css';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { createTicket, TICKET_CATEGORIES } from '../../lib/ticketService';
import type { TicketCategory } from '../../lib/ticketService';
import { fetchUserSessions } from '../../lib/sessionService';
import type { DbSessionRow } from '../../lib/sessionService';

const CHANNELS = [
  { ico: '📖', title: 'Documentation', body: 'Guides for uploading, lap detection, sectors and sharing.', cta: 'Read the docs →', to: '/docs' },
  { ico: '🎫', title: 'Open a ticket', body: 'Signed in? Raise a support ticket and track our replies in the app.', cta: 'Go to the app →', to: '/app' },
  { ico: '💬', title: 'Community', body: 'Swap setups and track configs with other riders and drivers.', cta: 'Join the paddock →', to: '#' },
];

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Bug / something broke',
  feature: 'Feature request',
  account: 'Account & billing',
  data: 'Data / lap detection',
  other: 'Something else',
};

const FAQ = [
  { q: 'What files can I upload?', a: 'RaceBox VBO telemetry files today. More formats can be added over time.' },
  { q: 'The wrong track was detected — can I fix it?', a: 'Yes. Override the track on the session and the correct start/finish gate and sectors are applied.' },
  { q: 'How do I share a session with just one rider?', a: 'Set the session to Shared and name the riders. Only they — plus you — can see it.' },
  { q: 'Is my data private by default?', a: 'Yes. Every session and track config starts private and is only visible to you until you choose to share or publish it.' },
  { q: 'Does it cost anything?', a: 'You can start for free. Bring the RaceBox you already run — no extra hardware needed.' },
];

export default function SupportPage() {
  const { user } = useAuthStore();
  const [sent, setSent] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState<DbSessionRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Offer the user's own sessions to attach — most support is about a
  // specific recording ("this lap didn't detect").
  useEffect(() => {
    if (!user) return;
    fetchUserSessions().then(setSessions).catch(() => setSessions([]));
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTicket(user.id, subject.trim(), category, message.trim(), sessionId || null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.apexRoot}>
      <PublicHeader />

      <header className={styles.pageHero}>
        <div className={styles.glow} />
        <div className={styles.wrap}>
          <Link to="/" className={styles.backLink}>← Back to home</Link>
          <div className={styles.pageEyebrow}>Support</div>
          <h1>We've got your back.</h1>
          <p>Whether you're chasing a parsing quirk or a faster lap, here's how to get help.</p>
        </div>
      </header>

      <div className={styles.wrap}>
        <div className={styles.supportGrid}>
          {CHANNELS.map(c => (
            <div key={c.title} className={styles.supportCard}>
              <span className="ico" style={{ fontSize: 26, display: 'block', marginBottom: 14 }}>{c.ico}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <Link to={c.to}>{c.cta}</Link>
            </div>
          ))}
        </div>

        <section className={styles.docSection} style={{ paddingTop: 40 }}>
          <div className={styles.secHead} style={{ textAlign: 'left', margin: '0 0 24px' }}>
            <h2 style={{ fontSize: 30 }}>Frequently asked</h2>
          </div>
          <div className={styles.faqList}>
            {FAQ.map(f => (
              <div key={f.q} className={styles.faqItem}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.contactCard}>
          <h2>Open a support ticket</h2>
          <p>Tell us what you expected to see — the more detail, the faster we can help.</p>

          {!user ? (
            <div className={styles.callout} style={{ borderLeftColor: 'var(--apex-red)' }}>
              <strong>Sign in to open a ticket.</strong> Tickets are tied to your account so you can
              track our replies in the app. <Link to="/auth" style={{ color: 'var(--apex-red)' }}>Sign in or create an account →</Link>
            </div>
          ) : sent ? (
            <div className={styles.callout} style={{ borderLeftColor: 'var(--apex-red)' }}>
              <strong>Thanks — your ticket is in.</strong> We'll reply in the app. You can follow it under
              Support in <Link to="/app" style={{ color: 'var(--apex-red)' }}>your account</Link>.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="s-subject">Subject</label>
                <input id="s-subject" type="text" required value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="s-cat">Category</label>
                <select id="s-cat" value={category} onChange={e => setCategory(e.target.value as TicketCategory)}>
                  {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              {sessions.length > 0 && (
                <div className={styles.field}>
                  <label htmlFor="s-session">Related session <span style={{ color: 'var(--apex-dim)' }}>(optional)</span></label>
                  <select id="s-session" value={sessionId} onChange={e => setSessionId(e.target.value)}>
                    <option value="">— none —</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {(s.display_name || s.filename)}{s.circuit_name ? ` · ${s.circuit_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="s-msg">How can we help?</label>
                <textarea id="s-msg" required value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              {error && <div className={styles.callout} style={{ borderLeftColor: 'var(--danger)' }}>{error}</div>}
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Submit ticket →'}
              </button>
            </form>
          )}
          <div className={styles.formNote}>Prefer email? <a href="mailto:support@lapanalyser.com" style={{ color: 'var(--apex-red)' }}>support@lapanalyser.com</a></div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
