import type { DataPoint, GpsCoord, Lap, SectorBoundary, SectorResult } from './models';
import { haversineMeters } from '../utils/haversine';
import { timeAtDistanceMs } from './trackDistance';

export function nearestTrackPoint(clickLat: number, clickLng: number, points: DataPoint[]): DataPoint {
  let best = points[0];
  let bestDist = haversineMeters(clickLat, clickLng, best.gps.lat, best.gps.lng);
  for (let i = 1; i < points.length; i++) {
    const d = haversineMeters(clickLat, clickLng, points[i].gps.lat, points[i].gps.lng);
    if (d < bestDist) { bestDist = d; best = points[i]; }
  }
  return best;
}

const R = 6371000;

export function perpendicularEndpoints(gps: GpsCoord, heading: number, halfLengthM: number): [GpsCoord, GpsCoord] {
  const perpBearing = ((heading + 90) % 360) * Math.PI / 180;
  const lat = gps.lat * Math.PI / 180;
  const dlat = (halfLengthM * Math.cos(perpBearing) / R) * (180 / Math.PI);
  const dlng = (halfLengthM * Math.sin(perpBearing) / (R * Math.cos(lat))) * (180 / Math.PI);
  return [
    { lat: gps.lat + dlat, lng: gps.lng + dlng },
    { lat: gps.lat - dlat, lng: gps.lng - dlng },
  ];
}

export function computeSectorResults(boundaries: SectorBoundary[], lap: Lap): SectorResult[] {
  if (boundaries.length === 0) return [];
  const sorted = [...boundaries].sort((a, b) => a.distanceAlongLapM - b.distanceAlongLapM);
  const boundaryTimes = sorted.map(b => timeAtDistanceMs(lap.points, b.distanceAlongLapM));
  const timeEdges = [0, ...boundaryTimes, lap.lapTimeMs];
  const distEdges = [0, ...sorted.map(b => b.distanceAlongLapM), lap.trackLengthM];
  return distEdges.slice(0, -1).map((start, i) => ({
    label: `S${i + 1}`,
    startDistanceM: start,
    endDistanceM: distEdges[i + 1],
    timeMs: timeEdges[i + 1] - timeEdges[i],
  }));
}
