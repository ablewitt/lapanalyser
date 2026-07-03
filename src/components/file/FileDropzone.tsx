import { useCallback, useRef } from 'react';
import styles from './FileDropzone.module.css';
import { useSessionsStore } from '../../store/sessions';
import { useUiStore } from '../../store/ui';
import ParserWorker from '../../workers/parser.worker?worker';
import type { ParseResult } from '../../parsers/registry';

export default function FileDropzone() {
  const addSession = useSessionsStore(s => s.addSession);
  const { setLoading, setParseWarnings } = useUiStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const already = useSessionsStore.getState().sessions.some(s => s.filename === file.name);
    if (already) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const worker = new ParserWorker();
      worker.onmessage = (msg: MessageEvent<{ type: string; result?: ParseResult; message?: string }>) => {
        setLoading(false);
        worker.terminate();
        if (msg.data.type === 'success' && msg.data.result) {
          addSession(msg.data.result.session);
          setParseWarnings(msg.data.result.warnings);
        } else {
          alert(`Parse error: ${msg.data.message}`);
        }
      };
      worker.postMessage({ filename: file.name, content });
    };
    reader.readAsText(file);
  }, [addSession, setLoading, setParseWarnings]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    for (const file of Array.from(e.dataTransfer.files)) {
      processFile(file);
    }
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
