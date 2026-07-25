import L from 'leaflet';
import type { GpsCoord } from '../../domain/models';
import { heatmapColor } from '../../utils/colors';

export interface SegmentData {
  start: GpsCoord;
  end: GpsCoord;
  normalizedValue: number;
}

export class TelemetryCanvasLayer extends L.Layer {
  private _canvas: HTMLCanvasElement | null = null;
  private _segments: SegmentData[] = [];
  private _lmap: L.Map | null = null;

  setSegments(segments: SegmentData[]): this {
    this._segments = segments;
    this._redraw();
    return this;
  }

  onAdd(map: L.Map): this {
    this._lmap = map;
    this._canvas = L.DomUtil.create('canvas', 'leaflet-telemetry-canvas') as HTMLCanvasElement;
    this._canvas.style.position = 'absolute';
    this._canvas.style.pointerEvents = 'none';
    map.getPanes().overlayPane!.appendChild(this._canvas);
    map.on('moveend zoomend resize', this._redraw, this);
    this._redraw();
    return this;
  }

  onRemove(map: L.Map): this {
    map.off('moveend zoomend resize', this._redraw, this);
    if (this._canvas) {
      this._canvas.remove();
      this._canvas = null;
    }
    this._lmap = null;
    return this;
  }

  private _redraw = () => {
    if (!this._canvas || !this._lmap) return;

    const mapSize = this._lmap.getSize();
    this._canvas.width = mapSize.x;
    this._canvas.height = mapSize.y;

    const topLeft = this._lmap.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    const ctx = this._canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    for (const seg of this._segments) {
      const p1 = this._lmap.latLngToContainerPoint([seg.start.lat, seg.start.lng]);
      const p2 = this._lmap.latLngToContainerPoint([seg.end.lat, seg.end.lng]);

      ctx.strokeStyle = heatmapColor(seg.normalizedValue);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  };
}
