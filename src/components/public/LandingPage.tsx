import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import styles from './public.module.css';
import superbikeImg from '../../assets/disciplines/superbike.webp';
import motocrossImg from '../../assets/disciplines/motocross.webp';
import carsImg from '../../assets/disciplines/cars.webp';

const DISCIPLINES = [
  { img: superbikeImg, title: 'Superbike & Road', body: 'Lean angle, trail-braking and corner-exit drive, lap over lap.' },
  { img: motocrossImg, title: 'Motocross', body: 'Split rough sections, compare lines through ruts and rhythm.' },
  { img: carsImg, title: 'Cars & Karts', body: 'Sector deltas, minimum speeds and braking traces for the track-day crowd.' },
];

const FEATURES = [
  { n: '01 — DETECT', title: 'Automatic lap splitting', body: 'Drop your VBO file. Start/finish gate-crossing detection carves it into clean laps — no manual trimming.' },
  { n: '02 — COMPARE', title: 'Rider vs rider', body: "Overlay any lap against your best or a teammate's. Watch the delta build corner by corner." },
  { n: '03 — MEASURE', title: 'Sectors & speed traps', body: 'Define custom sectors and traps per track. Save configs, share them, set a default.' },
  { n: '04 — MAP', title: 'Live track map', body: 'Colour-coded speed and lean heat maps draped over the real circuit line.' },
  { n: '05 — SHARE', title: 'Private to public', body: 'Keep sessions private, share with named riders, or publish for the whole paddock.' },
  { n: '06 — SYNC', title: 'Your setup, everywhere', body: 'Base map, heat maps and overlays saved to your account and restored on every device.' },
];

export default function LandingPage() {
  return (
    <div className={styles.apexRoot}>
      <PublicHeader sections />

      <header className={styles.hero}>
        <div className={styles.speedlines} />
        <div className={styles.glow} />
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <div className={styles.kicker}><span className={styles.kickerDot} />GPS telemetry · every discipline</div>
            <h1 className={styles.heroTitle}>FIND THE<br />TENTHS.<br /><em className={styles.heroOutline}>OWN THE APEX.</em></h1>
            <p className={styles.heroLead}>Turn raw RaceBox VBO data into lap-by-lap insight. Braking points, lean angle, sector deltas and speed traps — for anyone chasing a faster lap.</p>
            <div className={styles.heroCta}>
              <Link className={`${styles.btn} ${styles.btnPrimary}`} to="/auth?mode=signup">Analyse your first lap →</Link>
              <Link className={`${styles.btn} ${styles.btnGhost}`} to="/docs">Read the docs</Link>
            </div>
            <div className={styles.stats}>
              <div className={styles.stat}><b>0.001s</b><span>Sector precision</span></div>
              <div className={styles.stat}><b>25Hz</b><span>GPS sampling</span></div>
              <div className={styles.stat}><b>∞</b><span>Riders compared</span></div>
            </div>
          </div>

          <div className={styles.telem}>
            <div className={styles.telemHead}><b>Morgan Park · Lap 14</b><span>PERSONAL BEST</span></div>
            <div className={styles.lapTime}>1:08.442</div>
            <svg className={styles.telemChart} viewBox="0 0 400 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="apexFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ff2e4d" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#ff2e4d" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 90 C40 30 70 40 110 70 S180 110 220 50 300 20 340 60 380 40 400 55" fill="none" stroke="#ff2e4d" strokeWidth="2.5" />
              <path d="M0 90 C40 30 70 40 110 70 S180 110 220 50 300 20 340 60 380 40 400 55 L400 120 L0 120 Z" fill="url(#apexFill)" />
              <path d="M0 100 C40 60 70 65 110 82 S180 118 220 74 300 55 340 82 380 70 400 80" fill="none" stroke="#4f8ef7" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.7" />
            </svg>
            <div className={styles.sectors}>
              <div className={styles.sector}><span>Sector 1</span><b>22.11</b></div>
              <div className={`${styles.sector} ${styles.sectorBest}`}><span>Sector 2</span><b>24.09</b></div>
              <div className={styles.sector}><span>Sector 3</span><b>22.24</b></div>
            </div>
          </div>
        </div>
      </header>

      <section id="disciplines" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.secHead}>
            <h2>One tool. Every lap.</h2>
            <p>If a stopwatch runs, LapAnalyser reads it. Same engine, tuned to whatever you ride or drive.</p>
          </div>
          <div className={styles.disc}>
            {DISCIPLINES.map(d => (
              <div key={d.title} className={styles.discCard}>
                <img className={styles.discImg} src={d.img} alt={d.title} loading="lazy" />
                <div className={styles.discOverlay} />
                <div className={styles.discBody}>
                  <h3>{d.title}</h3>
                  <p>{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className={`${styles.section} ${styles.sectionSurface}`}>
        <div className={styles.wrap}>
          <div className={styles.secHead}>
            <h2>Brains and brawn</h2>
            <p>The instinct to push, backed by data that tells you exactly where.</p>
          </div>
          <div className={styles.feat}>
            {FEATURES.map(f => (
              <div key={f.title} className={styles.featCard}>
                <div className={styles.featN}>{f.n}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.band}>
            <h2>Your next lap is faster.</h2>
            <p>Free to start. No hardware beyond the RaceBox you already run.</p>
            <Link className={`${styles.btn} ${styles.btnOnRed}`} to="/auth?mode=signup">Create your account →</Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
