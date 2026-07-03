import { useRef, useEffect } from 'react';

interface Props {
  xValues: number[];
  yValues: number[];
  zoomDomain: [number, number];
  onZoomChange: (domain: [number, number]) => void;
}

const TRACE_COLOR  = 'rgba(255,255,255,0.25)';
const EDGE_COLOR   = '#4f8ef7';
const HANDLE_HIT   = 8; // px tolerance for handle detection

type DragMode = 'pan' | 'resize-left' | 'resize-right';

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  xs: number[],
  ys: number[],
  zoom: [number, number],
  hoverMode: DragMode | null,
) {
  ctx.clearRect(0, 0, w, h);
  const n = xs.length;
  if (n === 0) return;

  const dataMin = xs[0];
  const dataMax = xs[n - 1];
  const xRange = dataMax - dataMin || 1;
  const stride = Math.max(1, Math.floor(n / 400));

  let yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < n; i += stride) {
    if (ys[i] < yMin) yMin = ys[i];
    if (ys[i] > yMax) yMax = ys[i];
  }
  const yRange = yMax - yMin || 1;

  const toX = (v: number) => ((v - dataMin) / xRange) * w;
  const toY = (v: number) => h - 2 - ((v - yMin) / yRange) * (h - 6);

  // Grey speed trace
  ctx.beginPath();
  ctx.strokeStyle = TRACE_COLOR;
  ctx.lineWidth = 1;
  let first = true;
  for (let i = 0; i < n; i += stride) {
    const cx = toX(xs[i]);
    const cy = toY(ys[i]);
    if (first) { ctx.moveTo(cx, cy); first = false; }
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  // Darken non-zoomed regions
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  const x1 = toX(zoom[0]);
  const x2 = toX(zoom[1]);
  ctx.fillRect(0, 0, x1, h);
  ctx.fillRect(x2, 0, w - x2, h);

  // Window border
  ctx.strokeStyle = EDGE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x1 + 0.75, 0.75, x2 - x1 - 1.5, h - 1.5);

  // Left handle
  const leftActive = hoverMode === 'resize-left';
  ctx.fillStyle = leftActive ? '#fff' : EDGE_COLOR;
  const hh = 16, hy = (h - hh) / 2;
  ctx.beginPath();
  ctx.roundRect(x1, hy, 5, hh, 2);
  ctx.fill();

  // Right handle
  const rightActive = hoverMode === 'resize-right';
  ctx.fillStyle = rightActive ? '#fff' : EDGE_COLOR;
  ctx.beginPath();
  ctx.roundRect(x2 - 5, hy, 5, hh, 2);
  ctx.fill();
}

export default function ZoomOverview({ xValues, yValues, zoomDomain, onZoomChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const xRef        = useRef(xValues);       xRef.current = xValues;
  const yRef        = useRef(yValues);       yRef.current = yValues;
  const zoomRef     = useRef(zoomDomain);    zoomRef.current = zoomDomain;
  const onChangeRef = useRef(onZoomChange);  onChangeRef.current = onZoomChange;

  const redraw = (zoom = zoomRef.current, hoverMode: DragMode | null = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) draw(ctx, canvas.width, canvas.height, xRef.current, yRef.current, zoom, hoverMode);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || xValues.length === 0) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redraw(zoomDomain);
  }, [xValues, yValues, zoomDomain]); // eslint-disable-line

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      redraw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []); // eslint-disable-line

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mode: DragMode | null = null;
    let startMouseX = 0;
    let startDomain: [number, number] = [0, 1];
    let rafId: number | null = null;
    let pendingDomain: [number, number] | null = null;

    const getW = () => canvas.getBoundingClientRect().width;

    const pixelToData = (px: number) => {
      const xs = xRef.current;
      return xs[0] + (px / getW()) * (xs[xs.length - 1] - xs[0]);
    };

    const windowPixels = () => {
      const xs = xRef.current;
      const dMin = xs[0]; const dMax = xs[xs.length - 1];
      const w = getW();
      const z = zoomRef.current;
      return [
        ((z[0] - dMin) / (dMax - dMin)) * w,
        ((z[1] - dMin) / (dMax - dMin)) * w,
      ];
    };

    const hitMode = (mx: number): DragMode | null => {
      const [p1, p2] = windowPixels();
      if (Math.abs(mx - p1) <= HANDLE_HIT) return 'resize-left';
      if (Math.abs(mx - p2) <= HANDLE_HIT) return 'resize-right';
      if (mx > p1 && mx < p2)              return 'pan';
      return null;
    };

    const setCursor = (m: DragMode | null) => {
      canvas.style.cursor =
        m === 'resize-left' || m === 'resize-right' ? 'ew-resize' :
        m === 'pan' ? 'grab' : 'default';
    };

    const onDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const hit = hitMode(mx);
      if (!hit) return;
      mode = hit;
      startMouseX = mx;
      startDomain = [...zoomRef.current] as [number, number];
      canvas.style.cursor = mode === 'pan' ? 'grabbing' : 'ew-resize';
      e.preventDefault();
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;

      if (!mode) {
        const hit = hitMode(mx);
        setCursor(hit);
        // Redraw handles to show hover highlight
        redraw(zoomRef.current, hit);
        return;
      }

      const delta = pixelToData(mx) - pixelToData(startMouseX);
      const xs  = xRef.current;
      const dMin = xs[0]; const dMax = xs[xs.length - 1];
      const minWidth = (dMax - dMin) * 0.02;

      let [lo, hi] = startDomain;

      if (mode === 'pan') {
        lo += delta; hi += delta;
        const w = startDomain[1] - startDomain[0];
        if (lo < dMin) { lo = dMin; hi = dMin + w; }
        if (hi > dMax) { hi = dMax; lo = dMax - w; }
      } else if (mode === 'resize-left') {
        lo = Math.max(dMin, Math.min(lo + delta, hi - minWidth));
      } else {
        hi = Math.min(dMax, Math.max(hi + delta, lo + minWidth));
      }

      const newDomain: [number, number] = [lo, hi];

      // Immediate canvas draw
      redraw(newDomain, mode);

      // Throttled React state update
      pendingDomain = newDomain;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (pendingDomain) { onChangeRef.current(pendingDomain); pendingDomain = null; }
        });
      }
    };

    const onUp = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      if (pendingDomain) { onChangeRef.current(pendingDomain); pendingDomain = null; }
      mode = null;
      canvas.style.cursor = 'default';
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []); // eslint-disable-line

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '52px', cursor: 'default' }}
    />
  );
}
