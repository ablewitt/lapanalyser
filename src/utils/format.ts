export function formatMs(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

export function formatKmh(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

export function formatG(g: number): string {
  return `${g.toFixed(3)}g`;
}

export function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(3)} km` : `${m.toFixed(0)} m`;
}
