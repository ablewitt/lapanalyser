import { parseFile } from '../parsers/registry';

self.onmessage = (e: MessageEvent<{ filename: string; content: string }>) => {
  const { filename, content } = e.data;
  try {
    const result = parseFile(filename, content);
    self.postMessage({ type: 'success', result });
  } catch (err) {
    self.postMessage({ type: 'error', message: (err as Error).message });
  }
};
