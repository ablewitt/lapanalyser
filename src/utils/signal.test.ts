import { describe, it, expect } from 'vitest';
import { movingAverage, findLocalMinima, findLocalMaxima, lttbDecimate } from './signal';

describe('movingAverage', () => {
  it('returns input unchanged for window=1', () => {
    const input = [1, 2, 3, 4, 5];
    expect(movingAverage(input, 1)).toEqual(input);
  });

  it('is causal (output[i] depends only on input[0..i])', () => {
    // With window=3: output[1] = avg(input[0], input[1]), does NOT include input[2]
    const result = movingAverage([1, 100, 1, 1, 1], 3);
    // output[1] = (1 + 100) / 2 = 50.5, not smoothed by future values
    expect(result[1]).toBeCloseTo(50.5, 5);
    // output[3] = (100 + 1 + 1) / 3 = 34.0  (window filled from i=1..3)
    expect(result[3]).toBeCloseTo(34.0, 5);
  });

  it('handles empty array', () => {
    expect(movingAverage([], 3)).toEqual([]);
  });

  it('smooths a spike after it passes the window', () => {
    const spike = [0, 0, 100, 0, 0, 0, 0, 0];
    const result = movingAverage(spike, 3);
    // Spike at index 2 still shows strongly at [2]; [5] is back to 0
    expect(result[2]).toBeGreaterThan(30);
    expect(result[5]).toBeCloseTo(0, 5);
  });
});

describe('findLocalMinima', () => {
  it('finds a clear minimum', () => {
    const arr = [5, 4, 3, 4, 5, 6, 5, 4, 5, 6];
    const mins = findLocalMinima(arr, 2);
    expect(mins).toContain(2); // index 2 is value 3
  });

  it('uses strict inequality (flat bottoms are not minima)', () => {
    // [5, 3, 3, 5] — neither index 1 nor 2 is strictly less than the other
    const arr = [5, 3, 3, 5];
    const mins = findLocalMinima(arr, 1);
    expect(mins).not.toContain(1);
    expect(mins).not.toContain(2);
  });

  it('respects halfWindow boundary exclusion', () => {
    // halfWindow=2 means the first and last 2 indices are excluded
    const arr = [0, 1, 2, 3, 2, 1, 0];
    const mins = findLocalMinima(arr, 2);
    expect(mins).not.toContain(0);
    expect(mins).not.toContain(arr.length - 1);
  });

  it('returns empty for monotone array', () => {
    expect(findLocalMinima([1, 2, 3, 4, 5], 1)).toHaveLength(0);
  });
});

describe('findLocalMaxima', () => {
  it('finds a clear maximum', () => {
    const arr = [1, 2, 5, 2, 1, 2, 3, 2, 1];
    const maxima = findLocalMaxima(arr, 2);
    expect(maxima).toContain(2); // peak at index 2
  });

  it('uses strict inequality (flat tops are not maxima)', () => {
    const arr = [1, 5, 5, 1];
    const maxima = findLocalMaxima(arr, 1);
    expect(maxima).not.toContain(1);
    expect(maxima).not.toContain(2);
  });

  it('finds multiple separate peaks', () => {
    const arr = [0, 3, 0, 0, 4, 0, 0, 2, 0];
    const maxima = findLocalMaxima(arr, 1);
    expect(maxima).toContain(1);
    expect(maxima).toContain(4);
    expect(maxima).toContain(7);
  });
});

describe('lttbDecimate', () => {
  it('returns unchanged if targetCount >= n', () => {
    const xs = [0, 1, 2, 3];
    const ys = [0, 1, 4, 9];
    const result = lttbDecimate(xs, ys, 10);
    expect(result.xs).toEqual(xs);
    expect(result.ys).toEqual(ys);
  });

  it('always preserves first and last point', () => {
    const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const ys = xs.map(x => x * x);
    const result = lttbDecimate(xs, ys, 4);
    expect(result.xs[0]).toBe(0);
    expect(result.xs[result.xs.length - 1]).toBe(9);
  });

  it('returns exactly targetCount points', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i);
    const ys = xs.map(x => Math.sin(x));
    const result = lttbDecimate(xs, ys, 20);
    expect(result.xs).toHaveLength(20);
    expect(result.ys).toHaveLength(20);
  });
});
