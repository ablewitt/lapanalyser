export interface GpsCoord {
  lat: number;
  lng: number;
}

export interface Gate {
  p1: GpsCoord;
  p2: GpsCoord;
  label: string;
}

export interface DataPoint {
  elapsedMs: number;
  distanceM: number;
  distanceAlongLapM: number;
  gps: GpsCoord;
  velocityKmh: number;
  heading: number;
  heightM: number;
  longAccG: number;
  vertAccG: number;
  xGyro: number;
  yGyro: number;
  zGyro: number;
  leanAngleDeg: number;
  satellites: number;
}

export interface LapMetrics {
  lapTimeMs: number;
  maxSpeedKmh: number;
  maxLeanAngleDeg: number;
  peakBrakingG: number;
  peakAccelG: number;
}

export type EventType = 'APEX' | 'BRAKING' | 'ACCELERATION' | 'TOP_SPEED';

export interface LapEvent {
  type: EventType;
  distanceAlongLapM: number;
  elapsedMs: number;
  velocityKmh: number;
  longAccG: number;
  gps: GpsCoord;
  label: string;
  detail: ApexDetail | BrakingDetail | AccelerationDetail | TopSpeedDetail;
}

export interface ApexDetail {
  type: 'APEX';
  cornerIndex: number;
  leanAngleDeg: number;
}

export interface BrakingDetail {
  type: 'BRAKING';
  entrySpeedKmh: number;
  exitSpeedKmh: number;
  peakDecelG: number;
}

export interface AccelerationDetail {
  type: 'ACCELERATION';
  exitSpeedKmh: number;
  peakAccelG: number;
}

export interface TopSpeedDetail {
  type: 'TOP_SPEED';
  straightIndex: number;
}

export interface Lap {
  id: string;
  sessionId: string;
  lapNumber: number;
  points: DataPoint[];
  lapTimeMs: number;
  trackLengthM: number;
  metrics: LapMetrics;
  events: LapEvent[];
}

export interface Session {
  id: string;
  filename: string;
  venue: string;
  dateRecorded: Date;
  gate: Gate;
  laps: Lap[];
}

export interface SectorBoundary {
  id: string;
  distanceAlongLapM: number;
  gps: GpsCoord;
  heading: number;
}

export interface SectorResult {
  label: string;
  startDistanceM: number;
  endDistanceM: number;
  timeMs: number;
}

export interface SpeedTrap {
  id: string;
  distanceAlongLapM: number;
  gps: GpsCoord;
  heading: number;
}

export interface SpeedTrapSnapshot {
  speedKmh: number;
  leanAngleDeg: number;
  longAccG: number;
  elapsedMs: number;
}

export interface SpeedTrapResult {
  label: string;
  distanceAlongLapM: number;
  snapshot: SpeedTrapSnapshot;
  timeDeltaMs: number | null;
  speedDeltaKmh: number | null;
}
