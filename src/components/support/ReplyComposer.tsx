import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME } from '../../lib/ticketService';
import type { DbSessionRow } from '../../lib/sessionService';
import styles from './ReplyComposer.module.css';

/**
 * Shared reply box with an image picker and (optionally) a session-reference
 * picker. onSend receives the trimmed text, chosen files, and chosen session
 * ids; the caller creates the message then uploads/attaches. `extraControls`
 * lets the admin thread slot in its internal-note toggle.
 */
export default function ReplyComposer({
  onSend, placeholder = 'Write a reply…', extraControls, sessions,
}: {
  onSend: (text: string, files: File[], sessionIds: string[]) => Promise<void>;
  placeholder?: string;
  extraControls?: ReactNode;
  sessions?: DbSessionRow[];
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sessionMap = new Map((sessions ?? []).map(s => [s.id, s]));
  const availableSessions = (sessions ?? []).filter(s => !sessionIds.includes(s.id));

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked: File[] = [];
    for (const f of Array.from(list)) {
      if (!ATTACHMENT_MIME.includes(f.type)) { setError(`${f.name}: unsupported type`); continue; }
      if (f.size > ATTACHMENT_MAX_BYTES) { setError(`${f.name}: over 5 MB`); continue; }
      picked.push(f);
    }
    if (picked.length) setError(null);
    setFiles(prev => [...prev, ...picked]);
    if (inputRef.current) inputRef.current.value = '';
  }

  const isEmpty = !text.trim() && files.length === 0 && sessionIds.length === 0;

  async function submit() {
    if (isEmpty) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text.trim(), files, sessionIds);
      setText('');
      setFiles([]);
      setSessionIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.box}>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} />

      {(files.length > 0 || sessionIds.length > 0) && (
        <div className={styles.chips}>
          {files.map((f, i) => (
            <span key={`f-${i}`} className={styles.chip}>
              {f.name}
              <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label="Remove">×</button>
            </span>
          ))}
          {sessionIds.map(id => (
            <span key={`s-${id}`} className={styles.chip}>
              📁 {sessionMap.get(id)?.display_name || sessionMap.get(id)?.filename || 'session'}
              <button type="button" onClick={() => setSessionIds(ids => ids.filter(x => x !== id))} aria-label="Remove">×</button>
            </span>
          ))}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <input
          ref={inputRef}
          type="file"
          accept={ATTACHMENT_MIME.join(',')}
          multiple
          hidden
          onChange={e => addFiles(e.target.files)}
        />
        <div className={styles.leftControls}>
          <button type="button" className={styles.attachBtn} onClick={() => inputRef.current?.click()}>
            📎 Image
          </button>
          {availableSessions.length > 0 && (
            <select
              className={styles.attachBtn}
              value=""
              onChange={e => { if (e.target.value) setSessionIds(ids => [...ids, e.target.value]); }}
            >
              <option value="">📁 Attach session…</option>
              {availableSessions.map(s => (
                <option key={s.id} value={s.id}>{s.display_name || s.filename}</option>
              ))}
            </select>
          )}
        </div>
        <div className={styles.rightControls}>
          {extraControls}
          <button onClick={submit} disabled={sending || isEmpty}>
            {sending ? 'Sending…' : 'Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}
