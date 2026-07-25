import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import styles from './public.module.css';

const CHANNELS = [
  { ico: '📖', title: 'Documentation', body: 'Guides for uploading, lap detection, sectors and sharing.', cta: 'Read the docs →', to: '/docs' },
  { ico: '✉️', title: 'Email support', body: 'Stuck on something specific? Send us the details and a sample file.', cta: 'support@lapanalyser.com', to: 'mailto:support@lapanalyser.com', external: true },
  { ico: '💬', title: 'Community', body: 'Swap setups and track configs with other riders and drivers.', cta: 'Join the paddock →', to: '#' },
];

const FAQ = [
  { q: 'What files can I upload?', a: 'RaceBox VBO telemetry files today. More formats can be added over time.' },
  { q: 'The wrong track was detected — can I fix it?', a: 'Yes. Override the track on the session and the correct start/finish gate and sectors are applied.' },
  { q: 'How do I share a session with just one rider?', a: 'Set the session to Shared and name the riders. Only they — plus you — can see it.' },
  { q: 'Is my data private by default?', a: 'Yes. Every session and track config starts private and is only visible to you until you choose to share or publish it.' },
  { q: 'Does it cost anything?', a: 'You can start for free. Bring the RaceBox you already run — no extra hardware needed.' },
];

export default function SupportPage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Stub: wire this to email / a support inbox when ready.
    setSent(true);
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
              {c.external
                ? <a href={c.to}>{c.cta}</a>
                : <Link to={c.to}>{c.cta}</Link>}
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
          <h2>Send us a message</h2>
          <p>Include your session file and what you expected to see — it helps us help you faster.</p>
          {sent ? (
            <div className={styles.callout} style={{ borderLeftColor: 'var(--apex-red)' }}>
              <strong>Thanks!</strong> This is a placeholder form — wire it to your support inbox to start receiving messages.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="s-name">Name</label>
                <input id="s-name" type="text" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="s-email">Email</label>
                <input id="s-email" type="email" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="s-msg">How can we help?</label>
                <textarea id="s-msg" required />
              </div>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%', justifyContent: 'center' }}>
                Send message →
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
