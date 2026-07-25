import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import styles from './public.module.css';

const NAV = [
  { id: 'quick-start', label: 'Quick start' },
  { id: 'supported-files', label: 'Supported files' },
  { id: 'lap-detection', label: 'Lap detection' },
  { id: 'comparing', label: 'Comparing laps' },
  { id: 'sectors-traps', label: 'Sectors & speed traps' },
  { id: 'sharing', label: 'Sharing' },
];

export default function DocsPage() {
  return (
    <div className={styles.apexRoot}>
      <PublicHeader />

      <header className={styles.pageHero}>
        <div className={styles.glow} />
        <div className={styles.wrap}>
          <Link to="/" className={styles.backLink}>← Back to home</Link>
          <div className={styles.pageEyebrow}>Documentation</div>
          <h1>Get up to speed.</h1>
          <p>Everything you need to go from a raw RaceBox file to a lap-by-lap breakdown. This is an outline — fill each section with your own screenshots and detail.</p>
        </div>
      </header>

      <div className={styles.wrap}>
        <div className={styles.docLayout}>
          <nav className={styles.docNav}>
            {NAV.map(n => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
          </nav>

          <div className={styles.docBody}>
            <section id="quick-start" className={styles.docSection}>
              <h2>Quick start</h2>
              <p>Four steps from install to insight:</p>
              <ol className={styles.stepList}>
                <li><strong>Create an account</strong> — <Link to="/auth?mode=signup" className={styles.code}>sign up</Link> with your email, then pick a username.</li>
                <li><strong>Upload a session</strong> — drag a <span className={styles.code}>.vbo</span> file onto the sidebar dropzone, or use the Sessions manager.</li>
                <li><strong>Review your laps</strong> — LapAnalyser auto-detects laps and lists them. Pick one as your reference.</li>
                <li><strong>Compare</strong> — overlay other laps or riders and read the delta across the chart, map and table.</li>
              </ol>
              <div className={styles.callout}><strong>Tip:</strong> track detection is automatic, but you can override the track per session if the venue is picked incorrectly.</div>
            </section>

            <section id="supported-files" className={styles.docSection}>
              <h2>Supported files</h2>
              <p>LapAnalyser currently reads <strong>RaceBox VBO</strong> telemetry files. GPS is sampled at 25&nbsp;Hz, giving sector timing down to the thousandth of a second.</p>
              <ul>
                <li>Coordinates are stored in decimal minutes and converted on import.</li>
                <li>Sessions are matched to a venue from the file's comments section.</li>
                <li>More parser formats can be added over time.</li>
              </ul>
            </section>

            <section id="lap-detection" className={styles.docSection}>
              <h2>Lap detection</h2>
              <p>Laps are detected by intersecting your GPS trace with the track's start/finish gate — a 2D line-segment crossing. Every crossing closes one lap and opens the next, so a session becomes a clean list of timed laps with no manual trimming.</p>
              <h3>When a lap looks wrong</h3>
              <p>If the wrong venue was detected, override the track on the session and the correct gate will be used.</p>
            </section>

            <section id="comparing" className={styles.docSection}>
              <h2>Comparing laps</h2>
              <p>Select a reference lap, then add any number of other laps — from the same session, a past session, or another rider. The chart overlays each trace, the map shows the racing lines side by side, and the table breaks the time down by sector.</p>
            </section>

            <section id="sectors-traps" className={styles.docSection}>
              <h2>Sectors & speed traps</h2>
              <p>Define custom sectors and speed traps per track. Save them as a named configuration, mark one as the default, and reuse it across every session at that venue.</p>
              <ul>
                <li>Multiple configs per track.</li>
                <li>Share a config with specific riders or make it public.</li>
                <li>Search publicly available configs to start from someone else's.</li>
              </ul>
            </section>

            <section id="sharing" className={styles.docSection}>
              <h2>Sharing</h2>
              <p>Every session and track config has three visibility levels:</p>
              <ul>
                <li><strong>Private</strong> — only you.</li>
                <li><strong>Shared</strong> — specific riders you name.</li>
                <li><strong>Public</strong> — discoverable by anyone.</li>
              </ul>
              <p>Need a hand? Head to <Link to="/support" className={styles.code}>Support</Link>.</p>
            </section>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
