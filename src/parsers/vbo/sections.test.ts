import { describe, it, expect } from 'vitest';
import { splitSections } from './sections';

const SAMPLE = `File created on 01/01/2025 @ 10:00

[header]
time
latitude
longitude

[comments]
Venue : Test Track
UTC Date Started : 01/01/2025 10:00

[data]
100000.00 -1234.56789 -09876.54321 100.0 180.0 +00100.0 0.0 1.0 0.0 0.0 0.0 0.0 8
`;

describe('splitSections', () => {
  it('parses known sections', () => {
    const sections = splitSections(SAMPLE);
    expect(sections.has('header')).toBe(true);
    expect(sections.has('comments')).toBe(true);
    expect(sections.has('data')).toBe(true);
  });

  it('stores preamble lines before any section header', () => {
    const sections = splitSections(SAMPLE);
    const preamble = sections.get('preamble')!;
    expect(preamble.some(l => l.includes('File created on'))).toBe(true);
  });

  it('keeps section content without the header line', () => {
    const sections = splitSections(SAMPLE);
    const header = sections.get('header')!;
    expect(header.some(l => l === 'time')).toBe(true);
    expect(header.some(l => l.includes('[header]'))).toBe(false);
  });

  it('section names are lowercased', () => {
    const content = '[UPPER]\nvalue\n';
    const sections = splitSections(content);
    expect(sections.has('upper')).toBe(true);
  });

  it('handles repeated section headers by appending to existing', () => {
    const content = '[section]\nfirst\n[section]\nsecond\n';
    const sections = splitSections(content);
    // Implementation keeps first instance, second group appended to same key
    const lines = sections.get('section')!;
    expect(lines).toContain('first');
    expect(lines).toContain('second');
  });

  it('returns empty map sections for a file with only preamble', () => {
    const sections = splitSections('just a preamble line\n');
    expect([...sections.keys()]).toEqual(['preamble']);
  });
});
