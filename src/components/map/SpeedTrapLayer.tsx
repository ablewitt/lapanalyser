import { Fragment } from 'react';
import { useMapEvents, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import type { SpeedTrap } from '../../domain/models';
import { perpendicularEndpoints } from '../../domain/sectors';
import { useSpeedTrapsStore } from '../../store/speedTraps';

const HALF_LENGTH_M = 20;
const COLOR = '#f59e0b';

function SpeedTrapClickHandler({ enabled, onAddTrap }: { enabled: boolean; onAddTrap: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onAddTrap(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  traps: SpeedTrap[];
  addingSpeedTrap: boolean;
  onAddTrap: (lat: number, lng: number) => void;
}

export default function SpeedTrapLayer({ traps, addingSpeedTrap, onAddTrap }: Props) {
  const removeTrap = useSpeedTrapsStore(s => s.removeTrap);
  const sorted = [...traps].sort((a, b) => a.distanceAlongLapM - b.distanceAlongLapM);

  return (
    <>
      <SpeedTrapClickHandler enabled={addingSpeedTrap} onAddTrap={onAddTrap} />
      {sorted.map((trap, i) => {
        const [p1, p2] = perpendicularEndpoints(trap.gps, trap.heading, HALF_LENGTH_M);
        const label = `T${i + 1}`;
        return (
          <Fragment key={trap.id}>
            <Polyline
              positions={[[p1.lat, p1.lng], [p2.lat, p2.lng]]}
              pathOptions={{ color: COLOR, weight: 3, opacity: 0.9 }}
            />
            <CircleMarker
              center={[trap.gps.lat, trap.gps.lng]}
              radius={6}
              pathOptions={{ color: COLOR, fillColor: COLOR, fillOpacity: 1, weight: 2 }}
              eventHandlers={{ click: () => removeTrap(trap.id) }}
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
