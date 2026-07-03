import { describe, it, expect } from 'vitest';
import { haversineMeters } from './haversine';

describe('haversineMeters', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineMeters(-28.261, 152.037, -28.261, 152.037)).toBe(0);
  });

  it('approximates 1° latitude ≈ 111.2 km near equator', () => {
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeCloseTo(111_194, -1); // within 10 m
  });

  it('approximates 1° longitude ≈ 96 km at lat -28°', () => {
    // cos(28°) ≈ 0.8829; 111_194 * 0.8829 ≈ 98_159 m
    const d = haversineMeters(-28, 0, -28, 1);
    expect(d).toBeCloseTo(98_200, -2); // within 100 m
  });

  it('is symmetric (A→B equals B→A)', () => {
    const d1 = haversineMeters(-28.261, 152.037, -28.265, 152.042);
    const d2 = haversineMeters(-28.265, 152.042, -28.261, 152.037);
    expect(d1).toBeCloseTo(d2, 6);
  });

  it('is positive for distinct points', () => {
    const d = haversineMeters(-27.228, 152.965, -27.229, 152.966);
    expect(d).toBeGreaterThan(0);
  });
});
