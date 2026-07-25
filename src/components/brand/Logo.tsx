import styles from './Logo.module.css';

interface LogoProps {
  /** Show the "LAPANALYSER" wordmark next to the mark. */
  wordmark?: boolean;
  /** Height of the mark in px; wordmark scales with it. */
  size?: number;
  className?: string;
}

/**
 * The Apex brand lockup: a skewed, glowing red bar + wordmark.
 * Reused across the public site (nav, footer, hero).
 */
export default function Logo({ wordmark = true, size = 26, className }: LogoProps) {
  return (
    <span
      className={`${styles.brand} ${className ?? ''}`}
      style={{ ['--mark-h' as string]: `${size}px`, fontSize: `${size * 0.73}px` }}
    >
      <span className={styles.mark} aria-hidden="true" />
      {wordmark && <span className={styles.word}>LAPANALYSER</span>}
    </span>
  );
}
