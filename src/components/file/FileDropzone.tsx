import { useCallback, useRef } from 'react';
import styles from './FileDropzone.module.css';
import { useSessionsStore } from '../../store/sessions';
import { useUiStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { parseVboContent } from '../../lib/parseWorker';
import { uploadSessionFile, saveSessionRecord, rekeySession, detectCircuitName } from '../../lib/sessionService';

export default function FileDropzone() {
  const { addSession, sessions } = useSessionsStore();
  const { setLoading, setParseWarnings } = useUiStore();
  const user = useAuthStore(s => s.user);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (sessions.some(s => s.filename === file.name)) return;

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
        lapCount, bestLapTimeMs, circuitName,
      );

      addSession(rekeySession(session, dbId));
      setParseWarnings(parseResult.warnings);
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [addSession, sessions, setLoading, setParseWarnings, user]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    for (const file of Array.from(e.dataTransfer.files)) processFile(file);
  }, [processFile]);

  return (
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
          for (const f of Array.from(e.target.files ?? [])) processFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
