import { useMemo, useRef, forwardRef, useImperativeHandle, memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Label,
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
}

const LapChart = forwardRef<LapChartHandle, Props>(function LapChart(
  { grids, xKey, xScale, yKey, label, unit, domain, xLabel, lapStyles,
    zoomDomain, onMouseMove, onMouseLeave },
  ref,
) {
  const xLabelRef = useRef<HTMLSpanElement>(null);
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const data = useMemo(() => {
    if (grids.length === 0 || !grids[0][xKey]) return [];
    const xs: number[] = grids[0][xKey];
    const n = xs.length;
    const stride = Math.max(1, Math.floor(n / MAX_POINTS));
    const rows: Record<string, number>[] = [];
    for (let i = 0; i < n; i += stride) {
      const row: Record<string, number> = { x: xs[i] * xScale };
      for (let g = 0; g < grids.length; g++) {
        row[`lap_${g}`] = grids[g][yKey]?.[i] ?? null;
      }
      rows.push(row);
    }
    return rows;
  }, [grids, xKey, xScale, yKey]);

  useImperativeHandle(ref, () => ({
    updateCursor(index: number | null) {
      if (index == null || !data[index]) {
        if (xLabelRef.current) xLabelRef.current.textContent = '';
        valueRefs.current.forEach(el => { if (el) el.textContent = '—'; });
        return;
      }
      const row = data[index];
      if (xLabelRef.current) {
        xLabelRef.current.textContent =
          `@ ${row.x.toFixed(1)} ${xLabel.includes('Distance') ? 'm' : 's'}`;
      }
      valueRefs.current.forEach((el, i) => {
        if (el) {
          const v = row[`lap_${i}`];
          el.textContent = v != null ? `${v.toFixed(2)} ${unit}` : '—';
        }
      });

    },
  }), [data, xLabel, unit]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelLabel}>{label} <span className={styles.unit}>({unit})</span></span>
        <span ref={xLabelRef} className={styles.xValue} />
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
            domain={domain ?? ['auto', 'auto']}
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
        </LineChart>
      </ResponsiveContainer>
      <div className={styles.valueBar}>
        {lapStyles.map(({ color, label: seriesLabel }, i) => (
          <span key={i} className={styles.valueItem}>
            <span className={styles.valueSwatch} style={{ background: color }} />
            {seriesLabel && <span className={styles.seriesLabel}>{seriesLabel}</span>}
            <span ref={el => { valueRefs.current[i] = el; }}>—</span>
          </span>
        ))}
      </div>
    </div>
  );
});

export default memo(LapChart);
