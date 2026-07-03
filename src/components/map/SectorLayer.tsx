import { Fragment } from 'react';
import { useMapEvents, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import type { SectorBoundary } from '../../domain/models';
import { perpendicularEndpoints } from '../../domain/sectors';
import { useSectorsStore } from '../../store/sectors';

const HALF_LENGTH_M = 20;

function SectorClickHandler({ enabled, onAddSector }: { enabled: boolean; onAddSector: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onAddSector(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  boundaries: SectorBoundary[];
  addingSector: boolean;
  onAddSector: (lat: number, lng: number) => void;
}

export default function SectorLayer({ boundaries, addingSector, onAddSector }: Props) {
  const removeBoundary = useSectorsStore(s => s.removeBoundary);
  const sorted = [...boundaries].sort((a, b) => a.distanceAlongLapM - b.distanceAlongLapM);

  return (
    <>
      <SectorClickHandler enabled={addingSector} onAddSector={onAddSector} />
      {sorted.map((boundary, i) => {
        const [p1, p2] = perpendicularEndpoints(boundary.gps, boundary.heading, HALF_LENGTH_M);
        const label = `S${i + 1}`;
        return (
          <Fragment key={boundary.id}>
            <Polyline
              positions={[[p1.lat, p1.lng], [p2.lat, p2.lng]]}
              pathOptions={{ color: '#ffffff', weight: 3, opacity: 0.9 }}
            />
            <CircleMarker
              center={[boundary.gps.lat, boundary.gps.lng]}
              radius={6}
              pathOptions={{ color: '#ffffff', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}
              eventHandlers={{ click: () => removeBoundary(boundary.id) }}
            >
              <Tooltip permanent direction="top" offset={[0, -8]}>
                {label}
              </Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}
    </>
  );
}
