/**
 * VBO stores GPS as decimal MINUTES (MMMMM.MMMMM).
 * RaceBox encodes east longitude as negative, so we must negate after conversion.
 *
 * Example: -01695.68816 → lat = -(1695.68816 / 60) = -28.261469°  (south, correct)
 *          -009122.22917 → lng = -(-9122.22917 / 60) = +152.037153° (east, correct)
 *
 * Rule: latitude negative = south (keep sign). Longitude: negate the converted value.
 */
export function parseLatDeg(raw: number): number {
  return raw / 60;
}

export function parseLngDeg(raw: number): number {
  return -(raw / 60);
}
