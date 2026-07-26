import { useEffect, useState } from 'react';
import { getAttachmentUrl } from '../../lib/ticketService';
import type { TicketAttachmentRow } from '../../lib/ticketService';
import SessionRef from './SessionRef';
import styles from './MessageAttachments.module.css';

function Thumb({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAttachmentUrl(storagePath).then(u => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [storagePath]);

  if (!url) return <div className={styles.placeholder} />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className={styles.thumb}>
      <img src={url} alt="attachment" loading="lazy" />
    </a>
  );
}

export default function MessageAttachments({ attachments }: { attachments?: TicketAttachmentRow[] }) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(a => a.kind === 'image' && a.storage_path);
  const sessions = attachments.filter(a => a.kind === 'session' && a.session_id);

  return (
    <>
      {sessions.map(a => <SessionRef key={a.id} sessionId={a.session_id!} />)}
      {images.length > 0 && (
        <div className={styles.grid}>
          {images.map(a => <Thumb key={a.id} storagePath={a.storage_path!} />)}
        </div>
      )}
    </>
  );
}
