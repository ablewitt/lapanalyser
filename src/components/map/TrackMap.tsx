import { useEffect, useRef, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SelectedLap } from '../../hooks/useSelectedLaps';
import type { GpsCoord, SectorBoundary } from '../../domain/models';
import { TelemetryCanvasLayer } from './TelemetryCanvasLayer';
import type { SegmentData } from './TelemetryCanvasLayer';
import SectorLayer from './SectorLayer';
import styles from './TrackMap.module.css';
import { formatKmh, formatDist } from '../../utils/format';

type HeatChannel = 'velocityKmh' | 'longAccG' | 'leanAngleDeg';

interface Props {
  selectedLaps: SelectedLap[];
  circuitOutline?: GpsCoord[] | null;
  sectorBoundaries?: SectorBoundary[];
  addingSector?: boolean;
  onSectorClick?: (lat: number, lng: number) => void;
}

export interface CursorPosition {
  gps: GpsCoord;
  color: string;
}

export interface TrackMapHandle {
  updateCursor(positions: CursorPosition[] | null): void;
}

const TrackMap = forwardRef<TrackMapHandle, Props>(function TrackMap({ selectedLaps, circuitOutline, sectorBoundaries = [], addingSector = false, onSectorClick }, ref) {
  const [heatChannel, setHeatChannel] = useState<HeatChannel>('velocityKmh');
  const [baseMap, setBaseMap] = useState<'osm' | 'satellite' | 'dark' | 'off'>('satellite');
  const canvasLayerRef = useRef<TelemetryCanvasLayer | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorMarkersRef = useRef<L.CircleMarker[]>([]);
  const markerTargetsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const markerRafRef = useRef<number | null>(null);
  const targetPanRef = useRef<{ lat: number; lng: number } | null>(null);
  const panRafRef = useRef<number | null>(null);

  const referenceLap = selectedLaps[0]?.lap;

  const center = useMemo(() => {
    if (!referenceLap || referenceLap.points.length === 0) return [-28.26, 152.04] as [number, number];
    const lat = referenceLap.points.reduce((s, p) => s + p.gps.lat, 0) / referenceLap.points.length;
    const lng = referenceLap.points.reduce((s, p) => s + p.gps.lng, 0) / referenceLap.points.length;
    return [lat, lng] as [number, number];
  }, [referenceLap]);

  const segments: SegmentData[] = useMemo(() => {
    if (!referenceLap) return [];
    const pts = referenceLap.points;
    const values = pts.map(p => p[heatChannel] as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return pts.slice(0, -1).map((p, i) => ({
      start: p.gps,
      end: pts[i + 1].gps,
      normalizedValue: (values[i] - min) / range,
    }));
  }, [referenceLap, heatChannel]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!canvasLayerRef.current) {
      const layer = new TelemetryCanvasLayer();
      layer.addTo(mapRef.current);
      canvasLayerRef.current = layer;
    }
    canvasLayerRef.current.setSegments(segments);
  }, [segments]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);


  useEffect(() => {
    return () => {
      if (panRafRef.current !== null) cancelAnimationFrame(panRafRef.current);
      if (markerRafRef.current !== null) cancelAnimationFrame(markerRafRef.current);
      cursorMarkersRef.current.forEach(m => m.remove());
      cursorMarkersRef.current = [];
    };
  }, []);

  useImperativeHandle(ref, () => ({
    updateCursor(positions: CursorPosition[] | null) {
      if (!mapRef.current) return;
      const map = mapRef.current;

      if (!positions || positions.length === 0) {
        cursorMarkersRef.current.forEach(m => m.remove());
        cursorMarkersRef.current = [];
        markerTargetsRef.current = [];
        targetPanRef.current = null;
        return;
      }

      // Add missing markers — snap directly to first position so they don't fly from [0,0]
      while (cursorMarkersRef.current.length < positions.length) {
        const idx = cursorMarkersRef.current.length;
        const { gps, color } = positions[idx];
        const m = L.circleMarker([gps.lat, gps.lng], {
          radius: 4,
          color,
          fillColor: color,
          fillOpacity: 0,
          weight: 2.5,
          interactive: false,
        }).addTo(map);
        cursorMarkersRef.current.push(m);
        markerTargetsRef.current.push({ lat: gps.lat, lng: gps.lng });
      }

      // Remove excess markers
      while (cursorMarkersRef.current.length > positions.length) {
        cursorMarkersRef.current.pop()?.remove();
        markerTargetsRef.current.pop();
      }

      // Update colour and target position for each marker
      positions.forEach(({ gps, color }, i) => {
        cursorMarkersRef.current[i].setStyle({ color, fillColor: color });
        markerTargetsRef.current[i] = { lat: gps.lat, lng: gps.lng };
      });

      // Start animation loop if not already running
      if (markerRafRef.current === null) {
        const EASE = 0.25;
        const THRESHOLD = 1e-7;
        const step = () => {
          let allDone = true;
          cursorMarkersRef.current.forEach((marker, i) => {
            const target = markerTargetsRef.current[i];
            if (!target) return;
            const curr = marker.getLatLng();
            const dLat = target.lat - curr.lat;
            const dLng = target.lng - curr.lng;
            if (Math.abs(dLat) < THRESHOLD && Math.abs(dLng) < THRESHOLD) return;
            allDone = false;
            marker.setLatLng([curr.lat + dLat * EASE, curr.lng + dLng * EASE]);
          });
          markerRafRef.current = allDone ? null : requestAnimationFrame(step);
        };
        markerRafRef.current = requestAnimationFrame(step);
      }

      // Smooth pan: update target and start rAF loop if not already running.
      // Each frame eases 15% toward the target — no jumps, always responsive.
      const ref0 = positions[0].gps;
      targetPanRef.current = ref0;

      if (panRafRef.current === null) {
        const EASE = 0.15;
        const THRESHOLD = 1e-6; // ~0.1 m at equator
        const step = () => {
          const m = mapRef.current;
          const target = targetPanRef.current;
          if (!m || !target) { panRafRef.current = null; return; }
          const curr = m.getCenter();
          const dLat = target.lat - curr.lat;
          const dLng = target.lng - curr.lng;
          if (Math.abs(dLat) < THRESHOLD && Math.abs(dLng) < THRESHOLD) {
            panRafRef.current = null;
            targetPanRef.current = null;
            return;
          }
          m.setView(
            [curr.lat + dLat * EASE, curr.lng + dLng * EASE],
            m.getZoom(),
            { animate: false },
          );
          panRafRef.current = requestAnimationFrame(step);
        };
        panRafRef.current = requestAnimationFrame(step);
      }
    },
  }), []);

  return (
    <div className={styles.container} ref={containerRef} style={addingSector ? { cursor: 'crosshair' } : undefined}>
      <div className={styles.controls}>
        <span className={styles.label}>Base:</span>
        {(['off', 'dark', 'osm', 'satellite'] as const).map(bm => (
          <button key={bm} className={baseMap === bm ? 'active' : ''} onClick={() => setBaseMap(bm)}>
            {bm === 'off' ? 'Off' : bm === 'dark' ? 'Dark' : bm === 'osm' ? 'Streets' : 'Satellite'}
          </button>
        ))}
        <span className={styles.divider} />
        <span className={styles.label}>Heatmap:</span>
        {(['velocityKmh', 'longAccG', 'leanAngleDeg'] as HeatChannel[]).map(ch => (
          <button
            key={ch}
            className={heatChannel === ch ? 'active' : ''}
            onClick={() => setHeatChannel(ch)}
          >
            {ch === 'velocityKmh' ? 'Speed' : ch === 'longAccG' ? 'Long Acc' : 'Lean Angle'}
          </button>
        ))}
      </div>
      <MapContainer
        center={center}
        zoom={16}
        maxZoom={22}
        style={{ height: 'calc(100% - 40px)', width: '100%' }}
        ref={mapRef as any}
      >
        {baseMap === 'osm' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            maxNativeZoom={19} maxZoom={22}
          />
        )}
        {baseMap === 'satellite' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP'
            maxNativeZoom={17} maxZoom={22}
          />
        )}
        {baseMap === 'dark' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
            maxNativeZoom={19} maxZoom={22}
          />
        )}
        {circuitOutline && circuitOutline.length > 1 && (
          <Polyline
            positions={circuitOutline.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: '#444444', weight: 1, opacity: 1 }}
          />
        )}
        {selectedLaps.map(({ lap, color }) => (
          <Polyline
            key={lap.id}
            positions={lap.points.map(p => [p.gps.lat, p.gps.lng] as [number, number])}
            pathOptions={{ color, weight: 2, opacity: 0.65 }}
          />
        ))}
        {selectedLaps.flatMap(({ lap }) =>
          lap.events.map((ev, i) => (
            <CircleMarker
              key={`${lap.id}-${i}`}
              center={[ev.gps.lat, ev.gps.lng]}
              radius={5}
              pathOptions={{
                color: ev.type === 'BRAKING' ? '#e64c4c' :
                       ev.type === 'APEX' ? '#f58231' :
                       ev.type === 'ACCELERATION' ? '#3cb44b' : '#4f8ef7',
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div style={{ fontSize: 12, minWidth: 120 }}>
                  <strong>{ev.label}</strong><br />
                  {formatKmh(ev.velocityKmh)}<br />
                  {formatDist(ev.distanceAlongLapM)} from start
                </div>
              </Popup>
            </CircleMarker>
          ))
        )}
        <SectorLayer
          boundaries={sectorBoundaries}
          addingSector={addingSector}
          onAddSector={onSectorClick ?? (() => {})}
        />
      </MapContainer>
    </div>
  );
});

export default TrackMap;
