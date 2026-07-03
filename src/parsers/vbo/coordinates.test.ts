import { describe, it, expect } from 'vitest';
import { parseLatDeg, parseLngDeg } from './coordinates';

describe('VBO coordinate conversion', () => {
  it('converts southern latitude correctly', () => {
    // -01695.68816 → -28.2614693° (Morgan Park, QLD)
    const lat = parseLatDeg(-1695.68816);
    expect(lat).toBeCloseTo(-28.261469, 4);
  });

  it('converts eastern longitude correctly (negated)', () => {
    // -009122.22917 → +152.037153° (Morgan Park, QLD)
    const lng = parseLngDeg(-9122.22917);
    expect(lng).toBeCloseTo(152.037153, 4);
  });
});
