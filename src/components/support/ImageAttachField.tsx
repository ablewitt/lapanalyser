import { useRef, useState } from 'react';
import { ATTACHMENT_MIME, validateImageFile } from '../../lib/ticketService';
import styles from './ImageAttachField.module.css';

/**
 * Controlled image picker for ticket creation forms: adds/removes image files
 * with client-side type/size validation. Upload happens on submit.
 */
export default function ImageAttachField({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked: File[] = [];
    for (const f of Array.from(list)) {
      const err = validateImageFile(f);
      if (err) { setError(err); continue; }
      picked.push(f);
    }
    if (picked.length) { setError(null); onChange([...files, ...picked]); }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className={styles.wrap}>
      {files.length > 0 && (
        <div className={styles.chips}>
          {files.map((f, i) => (
            <span key={i} className={styles.chip}>
              {f.name}
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label="Remove">×</button>
            </span>
          ))}
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <input ref={inputRef} type="file" accept={ATTACHMENT_MIME.join(',')} multiple hidden onChange={e => addFiles(e.target.files)} />
      <button type="button" className={styles.btn} onClick={() => inputRef.current?.click()}>📎 Attach image</button>
    </div>
  );
}
