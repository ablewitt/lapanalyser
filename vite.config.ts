import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync, existsSync, createReadStream } from 'fs';
import { join } from 'path';

interface CircuitIndexEntry {
  name: string;
  country: string;
  path: string;
  centLat: number;
  centLng: number;
  minLat: number; maxLat: number;
  minLng: number; maxLng: number;
  // Decimated GPS sample for layout scoring (≤30 pts)
  sample: [number, number][];
}

function parseCirPoints(text: string): [number, number][] {
  const m = text.match(/\[data\]([\s\S]*)/i);
  if (!m) return [];
  const pts: [number, number][] = [];
  for (const line of m[1].trim().split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p.length < 4) continue;
    const rawLat = parseFloat(p[2]);
    const rawLng = parseFloat(p[3]);
    if (isNaN(rawLat) || isNaN(rawLng)) continue;
    pts.push([+(rawLat / 60).toFixed(6), +(-(rawLng / 60)).toFixed(6)]);
  }
  return pts;
}

function buildCircuitIndex(cirDir: string): string {
  const entries: CircuitIndexEntry[] = [];
  if (!existsSync(cirDir)) return '[]';
  for (const country of readdirSync(cirDir)) {
    const countryDir = join(cirDir, country);
    let files: string[];
    try { files = readdirSync(countryDir); } catch { continue; }
    for (const file of files) {
      if (!/\.cir$/i.test(file)) continue;
      const pts = parseCirPoints(readFileSync(join(countryDir, file), 'latin1'));
      if (pts.length < 2) continue;
      const centLat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const centLng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const step = Math.max(1, Math.floor(pts.length / 30));
      entries.push({
        name: file.replace(/\.cir$/i, ''),
        country,
        path: `/cir/${encodeURIComponent(country)}/${encodeURIComponent(file)}`,
        centLat: +centLat.toFixed(6),
        centLng: +centLng.toFixed(6),
        minLat: +Math.min(...pts.map(p => p[0])).toFixed(6),
        maxLat: +Math.max(...pts.map(p => p[0])).toFixed(6),
        minLng: +Math.min(...pts.map(p => p[1])).toFixed(6),
        maxLng: +Math.max(...pts.map(p => p[1])).toFixed(6),
        sample: pts.filter((_, i) => i % step === 0).slice(0, 30),
      });
    }
  }
  return JSON.stringify(entries);
}

function circuitIndexPlugin(): Plugin {
  const cirDir = join(process.cwd(), 'Racelogic', 'CIR Files');
  console.log('[circuit-index] Building circuit index…');
  const indexJson = buildCircuitIndex(cirDir);
  const count = JSON.parse(indexJson).length;
  console.log(`[circuit-index] ${count} circuits indexed.`);

  return {
    name: 'circuit-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/circuit-index.json') {
          res.setHeader('Content-Type', 'application/json');
          res.end(indexJson);
          return;
        }
        if (req.url?.startsWith('/cir/')) {
          const rest = req.url.slice('/cir/'.length);
          const slash = rest.indexOf('/');
          if (slash === -1) { next(); return; }
          const country = decodeURIComponent(rest.slice(0, slash));
          const filename = decodeURIComponent(rest.slice(slash + 1));
          const fp = join(cirDir, country, filename);
          if (existsSync(fp)) {
            res.setHeader('Content-Type', 'text/plain; charset=latin1');
            createReadStream(fp).pipe(res as any);
            return;
          }
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'circuit-index.json', source: indexJson });
      if (!existsSync(cirDir)) return;
      for (const country of readdirSync(cirDir)) {
        const dir = join(cirDir, country);
        let files: string[];
        try { files = readdirSync(dir); } catch { continue; }
        for (const file of files) {
          if (!/\.cir$/i.test(file)) continue;
          this.emitFile({
            type: 'asset',
            fileName: `cir/${country}/${file}`,
            source: readFileSync(join(dir, file), 'latin1'),
          });
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), circuitIndexPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
