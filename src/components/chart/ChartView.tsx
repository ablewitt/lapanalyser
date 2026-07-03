import { useRef, useCallback, useState, useEffect, useMemo, type RefCallback } from 'react';
import styles from './ChartView.module.css';
import { useCombinedLaps } from '../../hooks/useCombinedLaps';
import { useSelectionStore } from '../../store/selection';
import { useDistanceGrid, useTimeGrid } from '../../hooks/useDistanceGrid';
import { useSessionsStore } from '../../store/sessions';
import { useSessionCircuit } from '../../hooks/useSessionCircuit';
import LapChart from './LapChart';
import type { LapChartHandle } from './LapChart';
import TrackMap from '../map/TrackMap';
import type { TrackMapHandle, CursorPosition } from '../map/TrackMap';
import ZoomOverview from './ZoomOverview';
import type { DataPoint } from '../../domain/models';

const MAX_POINTS = 600;

const BASE_CHANNELS: { key: string; label: string; unit: string; domain?: [number, number] }[] = [
  { key: 'velocityKmh', label: 'Speed', unit: 'km/h' },
  { key: 'longAccG', label: 'Long. Acc', unit: 'g', domain: [-1.5, 1.5] },
  { key: 'leanAngleDeg', label: 'Lean Angle', unit: '°', domain: [-60, 60] },
];

function gpsAtDistance(points: DataPoint[], targetDist: number) {
  let lo = 0, hi = points.length - 1;
  if (targetDist <= points[0].distanceAlongLapM) return points[0].gps;
  if (targetDist >= points[hi].distanceAlongLapM) return points[hi].gps;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].distanceAlongLapM < targetDist) lo = mid; else hi = mid;
  }
  const span = points[hi].distanceAlongLapM - points[lo].distanceAlongLapM;
  const t = span < 1e-10 ? 0 : (targetDist - points[lo].distanceAlongLapM) / span;
  return {
    lat: points[lo].gps.lat + (points[hi].gps.lat - points[lo].gps.lat) * t,
    lng: points[lo].gps.lng + (points[hi].gps.lng - points[lo].gps.lng) * t,
  };
}

function gpsAtLapMs(points: DataPoint[], targetLapMs: number) {
  const lapStartMs = points[0].elapsedMs;
  const targetMs = targetLapMs + lapStartMs;
  let lo = 0, hi = points.length - 1;
  if (targetMs <= points[0].elapsedMs) return points[0].gps;
  if (targetMs >= points[hi].elapsedMs) return points[hi].gps;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].elapsedMs < targetMs) lo = mid; else hi = mid;
  }
  const span = points[hi].elapsedMs - points[lo].elapsedMs;
  const t = span < 1 ? 0 : (targetMs - points[lo].elapsedMs) / span;
  return {
    lat: points[lo].gps.lat + (points[hi].gps.lat - points[lo].gps.lat) * t,
    lng: points[lo].gps.lng + (points[hi].gps.lng - points[lo].gps.lng) * t,
  };
}

export default function ChartView() {
  const selectedLaps = useCombinedLaps();
  const firstSession = useSessionsStore(s => s.sessions[0] ?? null);
  const { points: circuitOutline } = useSessionCircuit(firstSession);
  const comparisonMode = useSelectionStore(s => s.comparisonMode);
  const distanceGrids = useDistanceGrid(selectedLaps);
  const timeGrids = useTimeGrid(selectedLaps);

  const chartRefs = useRef<(LapChartHandle | null)[]>([]);
  const mapRef = useRef<TrackMapHandle | null>(null);
  const [chartAreaEl, setChartAreaEl] = useState<HTMLDivElement | null>(null);

  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [mapHeight, setMapHeight] = useState(280);
  const mapHeightRef = useRef(mapHeight);
  mapHeightRef.current = mapHeight;
  const [resizeHandleEl, setResizeHandleEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!resizeHandleEl) return;
    const MIN = 100, MAX = 600;
    const onDown = (e: MouseEvent) => {
      const startY = e.clientY;
      const startH = mapHeightRef.current;
      const onMove = (ev: MouseEvent) => {
        setMapHeight(Math.min(MAX, Math.max(MIN, startH + ev.clientY - startY)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      e.preventDefault();
    };
    resizeHandleEl.addEventListener('mousedown', onDown);
    return () => resizeHandleEl.removeEventListener('mousedown', onDown);
  }, [resizeHandleEl]);

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef<number | null>(null);
  const lastXRef = useRef<number | null>(null);

  const selectedLapsRef = useRef(selectedLaps);
  selectedLapsRef.current = selectedLaps;
  const gridsRef = useRef<Record<string, number[]>[]>([]);
  gridsRef.current = (comparisonMode === 'distance' ? distanceGrids : timeGrids) as any[];
  const modeRef = useRef(comparisonMode);
  modeRef.current = comparisonMode;
  const xScaleRef = useRef(1);
  xScaleRef.current = comparisonMode === 'time' ? 1 / 1000 : 1;

  useEffect(() => { setZoomDomain(null); }, [selectedLaps, comparisonMode]);

  useEffect(() => {
    const el = chartAreaEl;
    if (!el) return;

    const onDown = () => {
      if (lastXRef.current == null) return;
      isDraggingRef.current = true;
      dragStartXRef.current = lastXRef.current;
    };

    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const x1 = dragStartXRef.current;
      const x2 = lastXRef.current;
      dragStartXRef.current = null;
      if (x1 == null || x2 == null) return;
      const lo = Math.min(x1, x2);
      const hi = Math.max(x1, x2);
      if (hi - lo < 1) return;
      setZoomDomain([lo, hi]);
    };

    const cancelDrag = () => {
      isDraggingRef.current = false;
      dragStartXRef.current = null;
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    document.addEventListener('mouseup', cancelDrag);
    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseup', cancelDrag);
    };
  }, [chartAreaEl]);

  const handleMouseMove = useCallback((state: any) => {
    const idx: number | null = state?.activeTooltipIndex ?? null;
    chartRefs.current.forEach(h => h?.updateCursor(idx));

    if (idx != null) {
      const grids = gridsRef.current;
      const mode = modeRef.current;
      const xArr: number[] | undefined =
        mode === 'distance' ? (grids[0] as any)?.distances : (grids[0] as any)?.times;
      if (xArr) {
        const stride = Math.max(1, Math.floor(xArr.length / MAX_POINTS));
        const gridIdx = Math.min(idx * stride, xArr.length - 1);
        lastXRef.current = xArr[gridIdx] * xScaleRef.current;
      }
    }

    const laps = selectedLapsRef.current;
    const grids = gridsRef.current;
    if (idx == null || laps.length === 0 || grids.length === 0) {
      mapRef.current?.updateCursor(null);
      return;
    }
    const mode = modeRef.current;
    const xValues: number[] = mode === 'distance' ? (grids[0] as any).distances : (grids[0] as any).times;
    if (!xValues) return;
    const stride = Math.max(1, Math.floor(xValues.length / MAX_POINTS));
    const gridIdx = Math.min(idx * stride, xValues.length - 1);
    const targetValue = xValues[gridIdx];

    const positions: CursorPosition[] = laps.map(({ lap, color }) => ({
      color,
      gps: mode === 'distance'
        ? gpsAtDistance(lap.points, targetValue)
        : gpsAtLapMs(lap.points, targetValue),
    }));
    mapRef.current?.updateCursor(positions);
  }, []);

  const handleMouseLeave = useCallback(() => {
    chartRefs.current.forEach(h => h?.updateCursor(null));
    mapRef.current?.updateCursor(null);
  }, []);

  const grids = comparisonMode === 'distance' ? distanceGrids : timeGrids;
  const xKey = comparisonMode === 'distance' ? 'distances' : 'times';
  const xLabel = comparisonMode === 'distance' ? 'Distance (m)' : 'Elapsed (s)';
  const xScale = comparisonMode === 'time' ? 1 / 1000 : 1;

  const deltaChannel = comparisonMode === 'distance'
    ? { key: 'timeDeltaS', label: 'Time Delta vs Ref', unit: 's' }
    : { key: 'distanceDeltaM', label: 'Distance Delta vs Ref', unit: 'm' };
  const channels = [...BASE_CHANNELS, deltaChannel];

  const lapStyles = useMemo(() =>
    selectedLaps.map(s => ({ color: s.color, label: s.label })),
    [selectedLaps],
  );

  const overviewXValues = useMemo(() => {
    const src = grids[0];
    if (!src) return [];
    const arr: number[] | undefined = (src as any)[xKey];
    return arr ? arr.map((v: number) => v * xScale) : [];
  }, [grids, xKey, xScale]);

  const overviewYValues = useMemo(() => {
    const src = grids[0];
    if (!src) return [];
    return (src as any).velocityKmh ?? [];
  }, [grids]);

  return (
    <div className={styles.wrap}>
      <div className={styles.mapPane} style={{ height: mapHeight }}>
        <TrackMap ref={mapRef} selectedLaps={selectedLaps} circuitOutline={circuitOutline} />
      </div>
      <div
        className={styles.mapResizeHandle}
        ref={setResizeHandleEl as React.RefCallback<HTMLDivElement>}
      />
      {selectedLaps.length === 0 ? (
        <div className={styles.empty}>
          <p>Select laps from the sidebar to compare</p>
        </div>
      ) : (
        <>
          {zoomDomain ? (
            <div className={styles.overviewWrap}>
              <ZoomOverview
                xValues={overviewXValues}
                yValues={overviewYValues}
                zoomDomain={zoomDomain}
                onZoomChange={setZoomDomain}
              />
              <button className={styles.resetZoom} onClick={() => setZoomDomain(null)}>
                ✕ Reset
              </button>
            </div>
          ) : (
            <div className={styles.chartsHeader}>
              <span className={styles.zoomHint}>Drag to zoom</span>
            </div>
          )}
          <div className={styles.charts} ref={setChartAreaEl as RefCallback<HTMLDivElement>}>
            {channels.map((ch, ci) => (
              <LapChart
                key={ch.key}
                ref={(el) => { chartRefs.current[ci] = el; }}
                grids={grids as any[]}
                xKey={xKey}
                xScale={xScale}
                yKey={ch.key}
                label={ch.label}
                unit={ch.unit}
                domain={(ch as any).domain}
                xLabel={xLabel}
                lapStyles={lapStyles}
                zoomDomain={zoomDomain}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
