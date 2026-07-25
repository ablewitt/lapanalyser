import ParserWorker from '../workers/parser.worker?worker';
import type { ParseResult } from '../parsers/registry';

export function parseVboContent(filename: string, content: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new ParserWorker();
    worker.onmessage = (msg: MessageEvent<{ type: string; result?: ParseResult; message?: string }>) => {
      worker.terminate();
      if (msg.data.type === 'success' && msg.data.result) {
        resolve(msg.data.result);
      } else {
        reject(new Error(msg.data.message ?? 'Parse failed'));
      }
    };
    worker.postMessage({ filename, content });
  });
}
