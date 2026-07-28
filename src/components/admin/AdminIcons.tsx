/**
 * Line icons for the admin nav, keyed by each module's route path. Stroke-based
 * and drawn in currentColor so they inherit the nav item's colour (dim → red
 * when the channel is active). Chosen from the subject's world where it helps
 * recognition: a tachometer for the status dashboard, a race-line loop for
 * sessions, a timeline for the audit log.
 */
const COMMON = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export default function AdminIcon({ name }: { name: string }) {
  switch (name) {
    case '': // Dashboard — tachometer / gauge
      return (
        <svg {...COMMON}>
          <path d="M4 16a8 8 0 0 1 16 0" />
          <path d="M12 16l4.2-3.4" />
          <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'users': // Users — person + group
      return (
        <svg {...COMMON}>
          <circle cx="9.5" cy="8.5" r="3.1" />
          <path d="M3.6 19a5.9 5.9 0 0 1 11.8 0" />
          <path d="M16.5 6.6a3 3 0 0 1 0 5.6" />
          <path d="M18 19a5.9 5.9 0 0 0-2.4-4.7" />
        </svg>
      );
    case 'sessions': // Sessions — closed-circuit race line with a start/finish tick
      return (
        <svg {...COMMON}>
          <path d="M7 7.5c-3 0-4.5 1.9-4.5 4.5S4 16.5 7.5 16.5H15c3.5 0 6-1.4 6-4.4 0-2.1-1.6-3.3-3.4-3.3-2.2 0-3 1.7-5.1 1.7S10 7.5 7 7.5Z" />
          <path d="M9.2 11.8v-1.6" />
        </svg>
      );
    case 'tickets': // Support — speech bubble
      return (
        <svg {...COMMON}>
          <path d="M20 12a7 7 0 0 1-7 7H8l-4 3v-4.6A7 7 0 0 1 4 12a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7Z" />
        </svg>
      );
    case 'audit': // Audit log — timeline of entries
      return (
        <svg {...COMMON}>
          <circle cx="6" cy="7" r="1.4" />
          <path d="M10 7h9" />
          <circle cx="6" cy="12" r="1.4" />
          <path d="M10 12h9" />
          <circle cx="6" cy="17" r="1.4" />
          <path d="M10 17h6" />
        </svg>
      );
    default:
      return null;
  }
}
