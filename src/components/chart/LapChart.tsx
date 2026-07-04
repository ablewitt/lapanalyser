import { useMemo, useRef, forwardRef, useImperativeHandle, memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Label, ReferenceLine,
} from 'recharts';
import styles from './LapChart.module.css';

const MAX_POINTS = 600;

export interface LapChartHandle {
  updateCursor(index: number | null): void;
}

interface Props {
  grids: Array<Record<string, number[]>>;
  xKey: string;
  xScale: number;
  yKey: string;
  label: string;
  unit: string;
  domain?: [number, number];
  xLabel: string;
  lapStyles: { color: string; label?: string }[];
  zoomDomain?: [number, number] | null;
  onMouseMove: (state: any) => void;
  onMouseLeave: () => void;
  deltaMode?: boolean;
  onToggleDelta?: () => void;
  sectorLines?: number[];
}

const LapChart = forwardRef<LapChartHandle, Props>(function LapChart(
  { grids, xKey, xScale, yKey, label, unit, domain, xLabel, lapStyles,
    zoomDomain, onMouseMove, onMouseLeave, deltaMode, onToggleDelta, sectorLines },
  ref,
) {
  const xLabelRef = useRef<HTMLSpanElement>(null);
  const absRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const deltaRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const data = useMemo(() => {
    if (grids.length === 0 || !grids[0][xKey]) return [];
    const xs: number[] = grids[0][xKey];
    const refY: number[] | undefined = grids[0][yKey];
    const n = xs.length;
    const stride = Math.max(1, Math.floor(n / MAX_POINTS));
    const rows: Record<string, number>[] = [];
    for (let i = 0; i < n; i += stride) {
      const row: Record<string, number> = { x: xs[i] * xScale };
      const refVal = refY?.[i] ?? 0;
      for (let g = 0; g < grids.length; g++) {
        const v = grids[g][yKey]?.[i];
        if (v != null) {
          row[`lap_${g}`] = deltaMode ? v - refVal : v;
          row[`lap_${g}_abs`] = v;
          row[`lap_${g}_delta`] = v - refVal;
        }
      }
      rows.push(row);
    }
    return rows;
  }, [grids, xKey, xScale, yKey, deltaMode]);

  useImperativeHandle(ref, () => ({
    updateCursor(index: number | null) {
      if (index == null || !data[index]) {
        if (xLabelRef.current) xLabelRef.current.textContent = '';
        absRefs.current.forEach(el => { if (el) el.textContent = '—'; });
        deltaRefs.current.forEach(el => { if (el) el.textContent = '—'; });
        return;
      }
      const row = data[index];
      if (xLabelRef.current) {
        xLabelRef.current.textContent =
          `@ ${row.x.toFixed(1)} ${xLabel.includes('Distance') ? 'm' : 's'}`;
      }
      absRefs.current.forEach((el, i) => {
        if (!el) return;
        const v = row[`lap_${i}_abs`] ?? row[`lap_${i}`];
        el.textContent = v != null ? `${v.toFixed(2)} ${unit}` : '—';
      });
      deltaRefs.current.forEach((el, i) => {
        if (!el) return;
        const v = row[`lap_${i}_delta`];
        if (v == null) { el.textContent = '—'; return; }
        el.textContent = `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
      });
    },
  }), [data, xLabel, unit]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelLabel}>
          {deltaMode ? 'Δ ' : ''}{label} <span className={styles.unit}>({unit})</span>
        </span>
        <span ref={xLabelRef} className={styles.xValue} />
        {onToggleDelta && (
          <button
            className={`${styles.deltaBtn}${deltaMode ? ` ${styles.deltaBtnActive}` : ''}`}
            onClick={onToggleDelta}
            title="Toggle delta vs reference"
          >Δ</button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 16, bottom: 20, left: 40 }}
          syncId="lap-sync"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          style={{ userSelect: 'none' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="x"
            type="number"
            domain={zoomDomain ?? ['dataMin', 'dataMax']}
            allowDataOverflow={zoomDomain != null}
            tick={{ fill: '#7c8db5', fontSize: 10 }}
            tickFormatter={(v) => v.toFixed(0)}
          >
            <Label value={xLabel} offset={-8} position="insideBottom" fill="#7c8db5" fontSize={10} />
          </XAxis>
          <YAxis
            domain={deltaMode ? ['auto', 'auto'] : (domain ?? ['auto', 'auto'])}
            tick={{ fill: '#7c8db5', fontSize: 10 }}
            width={36}
          />
          <Tooltip content={() => null} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
          {lapStyles.map(({ color }, i) => (
            <Line
              key={i}
              dataKey={`lap_${i}`}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
          {sectorLines?.map((dist, i) => (
            <ReferenceLine
              key={i}
              x={dist}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className={styles.valueBar}>
        {lapStyles.map(({ color, label: seriesLabel }, i) => (
          <span key={i} className={styles.valueItem}>
            <span className={styles.valueSwatch} style={{ background: color }} />
            {seriesLabel && <span className={styles.seriesLabel}>{seriesLabel}</span>}
            <span ref={el => { absRefs.current[i] = el; }}>—</span>
            {onToggleDelta && (
              <span className={styles.deltaValue}>
                Δ <span ref={el => { deltaRefs.current[i] = el; }}>—</span>
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
});

export default memo(LapChart);
