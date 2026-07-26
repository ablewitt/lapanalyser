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

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
