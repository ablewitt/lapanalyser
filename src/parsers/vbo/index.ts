import type { Session, Gate, GpsCoord } from '../../domain/models';
import { splitSections } from './sections';
import { parseLatDeg, parseLngDeg } from './coordinates';
import { parseDataRows } from './dataRows';
import { addCumulativeDistance } from '../../domain/trackDistance';
import { detectLapCrossings, assembleLaps } from '../../domain/lapDetection';
import { detectEvents } from '../../domain/eventDetection';
import type { FileParser, ParseResult } from '../registry';

function parseComments(lines: string[]): { venue: string; dateRecorded: Date } {
  let venue = 'Unknown';
  let dateRecorded = new Date();
  for (const line of lines) {
    const m = line.match(/^([^:]+?)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const val = m[2].trim();
    if (key === 'venue') venue = val;
    if (key === 'utc date started') {
      // Format: DD/MM/YYYY HH:MM
      const parts = val.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
      if (parts) {
        dateRecorded = new Date(
          parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]),
          parseInt(parts[4]), parseInt(parts[5]),
        );
      }
    }
  }
  return { venue, dateRecorded };
}

function parseLapTiming(lines: string[]): Gate | null {
  for (const line of lines) {
    if (!line.trim()) continue;
    // Format: Label  lat1 lng1 lat2 lng2 ¬ Description
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const lat1 = parseFloat(parts[1]);
    const lng1 = parseFloat(parts[2]);
    const lat2 = parseFloat(parts[3]);
    const lng2 = parseFloat(parts[4]);
    if (isNaN(lat1) || isNaN(lng1)) continue;
    return {
      p1: { lat: parseLatDeg(lat1), lng: parseLngDeg(lng1) },
      p2: { lat: parseLatDeg(lat2), lng: parseLngDeg(lng2) },
      label: parts[0],
    };
  }
  return null;
}

function sessionOrigin(points: { gps: GpsCoord }[]): GpsCoord {
  const lat = points.reduce((s, p) => s + p.gps.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.gps.lng, 0) / points.length;
  return { lat, lng };
}

function generateId(filename: string, date: Date): string {
  return `${filename.replace(/[^a-z0-9]/gi, '_')}_${date.getTime()}`;
}

const VboParser: FileParser = {
  name: 'VBO',

  canParse(filename: string, firstLine: string): boolean {
    return (
      filename.toLowerCase().endsWith('.vbo') ||
      firstLine.startsWith('File created on')
    );
  },

  parse(filename: string, content: string): ParseResult {
    const warnings: string[] = [];
    const sections = splitSections(content);

    const { venue, dateRecorded } = parseComments(sections.get('comments') ?? []);

    const gate = parseLapTiming(sections.get('laptiming') ?? []);
    if (!gate) {
      warnings.push('No start/finish gate found in [laptiming] section.');
    }

    const dataLines = sections.get('data') ?? [];
    const points = parseDataRows(dataLines);

    if (points.length === 0) {
      throw new Error('No data points parsed from file.');
    }

    addCumulativeDistance(points);

    const id = generateId(filename, dateRecorded);

    if (!gate) {
      return {
        session: {
          id, filename, venue, dateRecorded,
          gate: { p1: { lat: 0, lng: 0 }, p2: { lat: 0, lng: 0 }, label: '' },
          laps: [],
        },
        warnings,
      };
    }

    const origin = sessionOrigin(points);
    const crossings = detectLapCrossings(points, gate, origin);

    if (crossings.length < 2) {
      warnings.push(`Only ${crossings.length} start/finish crossing(s) detected — need at least 2 for a complete lap.`);
    }

    const laps = assembleLaps(id, points, crossings);

    // Detect events for each lap
    for (const lap of laps) {
      lap.events = detectEvents(lap);
    }

    const session: Session = { id, filename, venue, dateRecorded, gate, laps };
    return { session, warnings };
  },
};

export default VboParser;
