import { useState, useEffect } from 'react';
import type { CircuitEntry } from '../domain/circuitDetection';

let cache: CircuitEntry[] | null = null;
let pending: Promise<CircuitEntry[]> | null = null;

export function useCircuitIndex(): CircuitEntry[] | null {
  const [index, setIndex] = useState<CircuitEntry[] | null>(cache);

  useEffect(() => {
    if (cache) { setIndex(cache); return; }
    if (!pending) {
      pending = fetch('/circuit-index.json')
        .then(r => r.json() as Promise<CircuitEntry[]>)
        .then(data => { cache = data; return data; })
        .catch(() => { pending = null; return [] as CircuitEntry[]; });
    }
    pending.then(setIndex);
  }, []);

  return index;
}
