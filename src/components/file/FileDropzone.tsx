import { useCallback, useRef, useState } from 'react';
import styles from './FileDropzone.module.css';
import { useSessionsStore } from '../../store/sessions';
import { useUiStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { parseVboContent } from '../../lib/parseWorker';
import { uploadSessionFile, saveSessionRecord, rekeySession, detectCircuitName } from '../../lib/sessionService';
import type { SessionMetadata } from '../../lib/sessionService';
import SessionMetadataDialog, { type SessionDetails } from '../sessions/SessionMetadataDialog';

export default function FileDropzone() {
  const { addSession } = useSessionsStore();
  const { setLoading, setParseWarnings } = useUiStore();
  const user = useAuthStore(s => s.user);
  const inputRef = useRef<HTMLInputElement>(null);
  // Files awaiting the metadata prompt before they're uploaded.
  const [pending, setPending] = useState<File[] | null>(null);

  const processFile = useCallback(async (file: File, metadata: SessionMetadata | null, displayName: string | null) => {
    setLoading(true);
    try {
      const content = await file.text();
      const dbId = crypto.randomUUID();
      const storagePath = `${user!.id}/${dbId}.vbo`;

      const [parseResult] = await Promise.all([
        parseVboContent(file.name, content),
        uploadSessionFile(file, storagePath),
      ]);

      const { session } = parseResult;
      const lapCount = session.laps.length;
      const bestLapTimeMs = lapCount > 0
        ? Math.round(Math.min(...session.laps.map(l => l.lapTimeMs)))
        : null;
      const gpsPoints = session.laps.flatMap(l => l.points.map(p => p.gps));
      const circuitName = await detectCircuitName(gpsPoints);

      await saveSessionRecord(
        dbId, user!.id, file.name,
        session.venue, session.dateRecorded, storagePath,
        lapCount, bestLapTimeMs, circuitName, metadata, displayName,
      );

      addSession({ ...rekeySession(session, dbId), displayName: displayName?.trim() || null });
      setParseWarnings(parseResult.warnings);
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [addSession, setLoading, setParseWarnings, user]);

  // Queue newly-selected files (skipping ones already loaded) for the metadata
  // prompt. getState() avoids a stale closure over the sessions list.
  const queueFiles = useCallback((files: File[]) => {
    const loaded = new Set(useSessionsStore.getState().sessions.map(s => s.filename));
    const fresh = files.filter(f => !loaded.has(f.name));
    if (fresh.length > 0) setPending(fresh);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    queueFiles(Array.from(e.dataTransfer.files));
  }, [queueFiles]);

  function handleSubmit({ name, metadata }: SessionDetails) {
    const files = pending ?? [];
    setPending(null);
    // A single name only makes sense for a single file; a batch keeps filenames.
    const displayName = files.length === 1 ? name : null;
    for (const file of files) processFile(file, metadata, displayName);
  }

  const count = pending?.length ?? 0;

  return (
    <>
      <div
        className={styles.dropzone}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <span>Drop session file</span>
        <span className={styles.hint}>or click to browse (.vbo)</span>
        <input
          ref={inputRef}
          type="file"
          accept=".vbo"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            queueFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>

      {pending && (
        <SessionMetadataDialog
          title={count > 1 ? `Add ${count} sessions` : 'Add session'}
          subtitle={pending.map(f => f.name).join(', ')}
          showName={count === 1}
          namePlaceholder={count === 1 ? pending[0].name : undefined}
          submitLabel={count > 1 ? 'Add sessions' : 'Add session'}
          onSubmit={handleSubmit}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
