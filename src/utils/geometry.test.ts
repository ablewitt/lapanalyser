import { describe, it, expect } from 'vitest';
import { segmentIntersect } from './geometry';

describe('segmentIntersect', () => {
  it('detects an intersecting cross', () => {
    // Horizontal AB: (0,0)→(10,0), Vertical CD: (5,-5)→(5,5)
    const t = segmentIntersect(0, 0, 10, 0, 5, -5, 5, 5);
    expect(t).not.toBeNull();
    expect(t!).toBeCloseTo(0.5, 5);
  });

  it('returns null for parallel segments', () => {
    const t = segmentIntersect(0, 0, 10, 0, 0, 1, 10, 1);
    expect(t).toBeNull();
  });

  it('returns null for non-intersecting T-shape', () => {
    // AB: (0,0)→(10,0), CD starts after end of AB
    const t = segmentIntersect(0, 0, 4, 0, 5, -5, 5, 5);
    expect(t).toBeNull();
  });
});
