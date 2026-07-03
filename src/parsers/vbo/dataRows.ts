import type { DataPoint } from '../../domain/models';
import { parseLatDeg, parseLngDeg } from './coordinates';
import { makeTimestampParser } from './timestamp';

/**
 * Parses the [data] section lines into DataPoint array.
 * Column order (from [column names]):
 * 0:time 1:lat 2:lng 3:velocity 4:heading 5:height 6:LongAcc 7:VertAcc
 * 8:xGyro 9:yGyro 10:zGyro 11:lean-angle 12:sats
 */
export function parseDataRows(lines: string[]): DataPoint[] {
  const parseTimestamp = makeTimestampParser();
  const points: DataPoint[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.trim().split(/\s+/);
    if (cols.length < 13) continue;

    const rawLat = parseFloat(cols[1]);
    const rawLng = parseFloat(cols[2]);

    if (!cols[0] || isNaN(rawLat) || isNaN(rawLng)) continue;

    points.push({
      elapsedMs: parseTimestamp(cols[0]),
      distanceM: 0,
      distanceAlongLapM: 0,
      gps: {
        lat: parseLatDeg(rawLat),
        lng: parseLngDeg(rawLng),
      },
      velocityKmh: parseFloat(cols[3]),
      heading: parseFloat(cols[4]),
      heightM: parseFloat(cols[5]),
      longAccG: parseFloat(cols[6]),
      vertAccG: parseFloat(cols[7]),
      xGyro: parseFloat(cols[8]),
      yGyro: parseFloat(cols[9]),
      zGyro: parseFloat(cols[10]),
      leanAngleDeg: parseFloat(cols[11]),
      satellites: parseInt(cols[12], 10),
    });
  }

  return points;
}
