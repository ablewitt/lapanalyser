import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import styles from './public.module.css';

// Unsplash photo credits for the discipline card imagery (src/assets/disciplines).
const PHOTO_CREDITS = [
  {
    author: '25snn',
    authorUrl: 'https://unsplash.com/@25snn?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    photoUrl: 'https://unsplash.com/photos/a-man-riding-a-motorcycle-mfBA-8DgYNM?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  {
    author: 'Gabriel Sanchez',
    authorUrl: 'https://unsplash.com/@gabrielsanchez?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    photoUrl: 'https://unsplash.com/photos/man-riding-motocross-dirt-motorcycle-during-daytime-jqlXLIj3aS8?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  {
    author: 'Appic',
    authorUrl: 'https://unsplash.com/@appic_cc?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    photoUrl: 'https://unsplash.com/photos/a-car-driving-on-a-race-track-during-the-day-Y__ZYcowSo0?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
];

export default function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footGrid}`}>
        <div className={styles.footLead}>
          <Logo size={22} />
          <p style={{ marginTop: 10 }}>Motorsport lap analysis for everyone chasing a faster time.</p>
        </div>
        <div className={styles.footCols}>
          <div>
            <strong>Product</strong>
            <Link to="/#features">Features</Link>
            <Link to="/#disciplines">Disciplines</Link>
            <Link to="/auth">Log in</Link>
          </div>
          <div>
            <strong>Learn</strong>
            <Link to="/docs">Documentation</Link>
            <Link to="/support">Support</Link>
            <Link to="/docs#quick-start">Quick start</Link>
          </div>
        </div>
      </div>
      <div className={`${styles.wrap} ${styles.footCredits}`}>
        Photography —{' '}
        {PHOTO_CREDITS.map((c, i) => (
          <span key={c.author}>
            {i > 0 && ' · '}
            Photo by <a href={c.authorUrl} target="_blank" rel="noopener noreferrer">{c.author}</a>
            {' '}on <a href={c.photoUrl} target="_blank" rel="noopener noreferrer">Unsplash</a>
          </span>
        ))}
      </div>
    </footer>
  );
}
