import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME } from '../../lib/ticketService';
import styles from './ReplyComposer.module.css';

/**
 * Shared reply box with an image picker. onSend receives the trimmed text and
 * the chosen files; the caller creates the message then uploads. `extraControls`
 * lets the admin thread slot in its internal-note toggle.
 */
export default function ReplyComposer({
  onSend, placeholder = 'Write a reply…', extraControls,
}: {
  onSend: (text: string, files: File[]) => Promise<void>;
  placeholder?: string;
  extraControls?: ReactNode;
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function submit() {
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text.trim(), files);
      setText('');
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.box}>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} />

      {files.length > 0 && (
        <div className={styles.chips}>
          {files.map((f, i) => (
            <span key={i} className={styles.chip}>
              {f.name}
              <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label="Remove">×</button>
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
        <button type="button" className={styles.attachBtn} onClick={() => inputRef.current?.click()}>
          📎 Image
        </button>
        <div className={styles.rightControls}>
          {extraControls}
          <button onClick={submit} disabled={sending || (!text.trim() && files.length === 0)}>
            {sending ? 'Sending…' : 'Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}
