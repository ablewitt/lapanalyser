import { describe, it, expect } from 'vitest';
import { makeTimestampParser } from './timestamp';

describe('makeTimestampParser', () => {
  it('converts HHMMSS.SS to elapsed ms correctly', () => {
    const parse = makeTimestampParser();
    expect(parse('0')).toBe(0);       // 00:00:00
    expect(parse('1')).toBe(1000);    // 00:00:01
    expect(parse('100')).toBe(60_000); // 00:01:00
    expect(parse('10000')).toBe(3_600_000); // 01:00:00
  });

  it('handles midnight rollover (decreasing time)', () => {
    const parse = makeTimestampParser();
    // Session starts at 23:59:30
    expect(parse('235930')).toBe(0);
    // One second later
    expect(parse('235931')).toBe(1000);
    // Crosses midnight — time jumps back to 00:00:01
    expect(parse('1')).toBe(31_000);
    // Continues normally
    expect(parse('2')).toBe(32_000);
  });

  it('elapsedMs is relative to first seen timestamp', () => {
    const parse = makeTimestampParser();
    const first = parse('120000'); // noon
    expect(first).toBe(0);
    expect(parse('120001')).toBe(1000);
  });
});
