import { useRef, useCallback, useEffect, useState } from 'react';
import styles from './TableView.module.css';
import { useCombinedLaps } from '../../hooks/useCombinedLaps';
import { useUiStore } from '../../store/ui';
import type { TableSubTab } from '../../store/ui';
import LapSummaryTable from './LapSummaryTable';
import EventTable from './EventTable';
import SectorSplitTable from './SectorSplitTable';
import SpeedTrapTable from './SpeedTrapTable';
import AppMap from '../map/AppMap';
import type { TrackMapHandle } from '../map/TrackMap';
import type { GpsCoord } from '../../domain/models';

export default function TableView() {
  const selectedLaps = useCombinedLaps();
  const subTab = useUiStore(s => s.tableSubTab);
  const setSubTab = useUiStore(s => s.setTableSubTab);
  const mapRef = useRef<TrackMapHandle | null>(null);

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

  const handleRowHover = useCallback((gps: GpsCoord, color: string) => {
    mapRef.current?.updateCursor([{ gps, color }]);
  }, []);

  const handleRowLeave = useCallback(() => {
    mapRef.current?.updateCursor(null);
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.mapPane} style={{ height: mapHeight }}>
        <AppMap ref={mapRef} visibilityControls />
      </div>
      <div
        className={styles.mapResizeHandle}
        ref={setResizeHandleEl as React.RefCallback<HTMLDivElement>}
      />
      <div className={styles.subTabs}>
        {(['summary', 'events', 'sectors', 'speed-traps'] as TableSubTab[]).map(t => (
          <button
            key={t}
            className={subTab === t ? 'active' : ''}
            onClick={() => setSubTab(t)}
          >
            {t === 'summary' ? 'Lap Summary' : t === 'events' ? 'Events' : t === 'sectors' ? 'Sectors' : 'Speed Traps'}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {subTab === 'summary' && <LapSummaryTable selectedLaps={selectedLaps} />}
        {subTab === 'events' && (
          <EventTable
            selectedLaps={selectedLaps}
            onRowHover={handleRowHover}
            onRowLeave={handleRowLeave}
          />
        )}
        {subTab === 'sectors' && (
          <SectorSplitTable
            selectedLaps={selectedLaps}
            onSectorHover={handleRowHover}
            onSectorLeave={handleRowLeave}
          />
        )}
        {subTab === 'speed-traps' && (
          <SpeedTrapTable
            selectedLaps={selectedLaps}
            onTrapHover={handleRowHover}
            onTrapLeave={handleRowLeave}
          />
        )}
      </div>
    </div>
  );
}
