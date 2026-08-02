import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SESSION_META_FIELDS, type SessionMetadata } from '../../lib/sessionService';
import styles from './SessionMetadataDialog.module.css';

const PLACEHOLDERS: Record<keyof SessionMetadata, string> = {
  vehicle: 'e.g. Yamaha YZF-R6',
  engine: 'e.g. Stock, or 636 big-bore kit',
  suspension: 'e.g. Öhlins — 8 clicks front, 12 rear',
  notes: 'Tyres, track conditions, changes made this session…',
};

export interface SessionDetails {
  name: string;
  metadata: SessionMetadata;
}

interface Props {
  title: string;
  subtitle?: ReactNode;
  initial?: SessionMetadata;
  /** When set, shows an editable session-name field (edit context only). */
  showName?: boolean;
  initialName?: string;
  namePlaceholder?: string;
  submitLabel: string;
  onSubmit: (result: SessionDetails) => void;
  onCancel: () => void;
}

/**
 * Optional session details form. Vehicle/engine/suspension/notes are always
 * available (nothing required); an editable name is shown when `showName` is set
 * (used from the Sessions manager, not the multi-file add flow). Reused both
 * when adding a session and when editing details later.
 */
export default function SessionMetadataDialog({
  title, subtitle, initial, showName, initialName, namePlaceholder, submitLabel, onSubmit, onCancel,
}: Props) {
  const [name, setName] = useState(initialName ?? '');
  const [values, setValues] = useState<SessionMetadata>(() => ({ ...initial }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const set = (key: keyof SessionMetadata, v: string) => setValues(prev => ({ ...prev, [key]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ name, metadata: values });
  }

  return createPortal(
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <form className={styles.dialog} onSubmit={submit}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button type="button" className={styles.closeBtn} onClick={onCancel} aria-label="Cancel">✕</button>
        </div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}

        <div className={styles.body}>
          {showName && (
            <label className={styles.field}>
              <span className={styles.label}>Name</span>
              <input
                className={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={namePlaceholder ?? 'Session name'}
                autoFocus
              />
            </label>
          )}
          <p className={styles.optional}>All fields are optional — add what's useful or skip.</p>
          {SESSION_META_FIELDS.map(({ key, label, multiline }) => (
            <label key={key} className={styles.field}>
              <span className={styles.label}>{label}</span>
              {multiline ? (
                <textarea
                  className={styles.textarea}
                  value={values[key] ?? ''}
                  onChange={e => set(key, e.target.value)}
                  rows={3}
                  placeholder={PLACEHOLDERS[key]}
                />
              ) : (
                <input
                  className={styles.input}
                  value={values[key] ?? ''}
                  onChange={e => set(key, e.target.value)}
                  placeholder={PLACEHOLDERS[key]}
                  autoFocus={!showName && key === 'vehicle'}
                />
              )}
            </label>
          ))}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.ghost} onClick={onCancel}>Cancel</button>
          <button type="submit" className={styles.primary}>{submitLabel}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
