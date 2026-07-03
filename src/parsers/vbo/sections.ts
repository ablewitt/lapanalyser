/**
 * Splits a VBO file into named sections.
 * Returns a map from lowercase section name to its content lines.
 * Lines before any section header are stored under key 'preamble'.
 */
export function splitSections(content: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  let currentKey = 'preamble';
  result.set(currentKey, []);

  for (const raw of content.split('\n')) {
    const line = raw.trimEnd();
    const match = line.match(/^\[([^\]]+)\]/);
    if (match) {
      currentKey = match[1].toLowerCase().trim();
      if (!result.has(currentKey)) result.set(currentKey, []);
    } else {
      result.get(currentKey)!.push(line);
    }
  }
  return result;
}
