/**
 * Parses VBO timestamp format HHMMSS.SS into milliseconds from session start.
 *
 * Accepts the raw column string to avoid floating-point arithmetic on the large
 * HHMMSS integer — instead the integer and centisecond parts are parsed separately
 * so all arithmetic stays exact.
 *
 * Creates a stateful parser that tracks midnight rollovers:
 * when parsed time decreases by more than 500ms compared to previous, assume midnight crossed.
 */
export function makeTimestampParser(): (raw: string) => number {
  let prevTodayMs = -1;
  let dayOffsetMs = 0;
  let sessionStartMs = -1;

  return function parse(raw: string): number {
    const dot = raw.indexOf('.');
    const intPart = dot >= 0 ? parseInt(raw.slice(0, dot), 10) : parseInt(raw, 10);
    const fracStr = dot >= 0 ? raw.slice(dot + 1) : '';
    // Read centiseconds from first two fractional digits (pad with zero if only one digit)
    const centiseconds = parseInt(fracStr.slice(0, 2).padEnd(2, '0'), 10);

    const h = Math.floor(intPart / 10000);
    const m = Math.floor((intPart % 10000) / 100);
    const s = intPart % 100;
    const todayMs = (h * 3600 + m * 60 + s) * 1000 + centiseconds * 10;

    if (prevTodayMs >= 0 && todayMs < prevTodayMs - 500) {
      dayOffsetMs += 86_400_000;
    }
    prevTodayMs = todayMs;

    const absoluteMs = dayOffsetMs + todayMs;
    if (sessionStartMs < 0) sessionStartMs = absoluteMs;
    return absoluteMs - sessionStartMs;
  };
}
