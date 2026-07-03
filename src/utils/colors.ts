// All entries are vivid mid-brightness — visible on both the dark app background
// and Leaflet's light-grey "off" map background (#ddd).
const PALETTE = [
  '#e6194b', // red
  '#3cb44b', // green
  '#4895ef', // bright blue
  '#f58231', // orange
  '#bb44ff', // vivid purple
  '#42d4f4', // cyan
  '#f032e6', // magenta
  '#c8ef00', // yellow-green
  '#ff6688', // hot pink
  '#469990', // teal
  '#aa66ff', // violet
  '#ddaa00', // amber
  '#ffdd00', // bright yellow
  '#ff6600', // vivid orange-red
  '#00dd88', // bright mint
];

/** Returns a stable color for a lap at given index in the selection order. */
export function lapColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export const GROUP_COLOR_A = lapColor(0);
export const GROUP_COLOR_B = lapColor(1);

/** Returns an rgba string with reduced opacity for group envelope fills. */
export function lapColorAlpha(index: number, alpha: number): string {
  const hex = lapColor(index).slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Map a 0–1 value to a blue→cyan→green→yellow→red heatmap color. */
export function heatmapColor(t: number): string {
  const v = Math.max(0, Math.min(1, t));

  // Five evenly-spaced stops give clear, distinct bands across the full range
  const stops: [number, number, number][] = [
    [  0,   0, 255], // blue
    [  0, 255, 255], // cyan
    [  0, 255,   0], // green
    [255, 255,   0], // yellow
    [255,   0,   0], // red
  ];

  const scaled = v * (stops.length - 1);
  const lo = Math.min(Math.floor(scaled), stops.length - 2);
  const f  = scaled - lo;
  const [r0, g0, b0] = stops[lo];
  const [r1, g1, b1] = stops[lo + 1];
  return `rgb(${Math.round(r0 + f * (r1 - r0))},${Math.round(g0 + f * (g1 - g0))},${Math.round(b0 + f * (b1 - b0))})`;
}
