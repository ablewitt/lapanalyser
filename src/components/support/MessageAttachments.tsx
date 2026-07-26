import { useEffect, useState } from 'react';
import { getAttachmentUrl } from '../../lib/ticketService';
import type { TicketAttachmentRow } from '../../lib/ticketService';
import styles from './MessageAttachments.module.css';

function Thumb({ attachment }: { attachment: TicketAttachmentRow }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAttachmentUrl(attachment.storage_path).then(u => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [attachment.storage_path]);

  if (!url) return <div className={styles.placeholder} />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className={styles.thumb}>
      <img src={url} alt="attachment" loading="lazy" />
    </a>
  );
}

export default function MessageAttachments({ attachments }: { attachments?: TicketAttachmentRow[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className={styles.grid}>
      {attachments.map(a => <Thumb key={a.id} attachment={a} />)}
    </div>
  );
}
