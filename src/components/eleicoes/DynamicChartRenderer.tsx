import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
  CartesianGrid, TooltipProps,
} from 'recharts';
import { formatNumber, CHART_COLORS } from '@/lib/eleicoes';
import type { ConfigVisual } from '@/hooks/useChatEleicoes';
import { processDataWithMapping } from '@/hooks/useChatEleicoes';

interface Props {
  configVisual: ConfigVisual;
  dadosBrutos: Record<string, any>[];
  colunas: string[];
}

/* ── Premium color palette ── */
const PREMIUM_COLORS = [
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
];

const COLORS = CHART_COLORS?.length > 0 ? CHART_COLORS : PREMIUM_COLORS;

/* ── Number formatting (pt-BR) ── */
function fmtBR(v: number | string): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR');
}

function fmtLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Custom Tooltip ── */
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/40 bg-popover/95 backdrop-blur-sm px-3 py-2.5 shadow-xl">
      <p className="text-[10px] font-semibold text-foreground/80 mb-1.5 border-b border-border/20 pb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {fmtLabel(String(p.dataKey || p.name || ''))}
          </span>
          <span className="text-[11px] font-bold text-foreground tabular-nums">{fmtBR(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Axis styling ── */
const AXIS_TICK = { fontSize: 10, fill: 'hsl(var(--muted-foreground))' };
const GRID_STYLE = { strokeDasharray: '3 3', stroke: 'hsl(var(--border) / 0.15)' };

/* ── SVG Gradient Defs ── */
function GradientDefs({ keys }: { keys: string[] }) {
  return (
    <defs>
      {keys.map((_, i) => {
        const color = COLORS[i % COLORS.length];
        return (
          <linearGradient key={`grad-${i}`} id={`areaGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        );
      })}
    </defs>
  );
}

export default function DynamicChartRenderer({ configVisual, dadosBrutos, colunas }: Props) {
  const { tipo_grafico, mapping, titulo } = configVisual;

  const chartData = useMemo(() => processDataWithMapping(dadosBrutos, mapping), [dadosBrutos, mapping]);

  if (!chartData?.length) return null;

  const axisKey = mapping.axis || colunas[0] || Object.keys(chartData[0])[0] || '';
  const dataKeys = mapping.dataKeys?.length > 0
    ? mapping.dataKeys
    : colunas.filter(c => c !== axisKey && typeof chartData[0]?.[c] === 'number');

  const displayKeys = dataKeys.length > 0 ? dataKeys : Object.keys(chartData[0]).filter(k => k !== axisKey && typeof chartData[0][k] === 'number');

  /* ── KPI ── */
  if (tipo_grafico === 'kpi') {
    const cols = displayKeys.length > 0 ? displayKeys : colunas;
    return (
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
        {cols.map(col => (
          <div key={col} className="rounded-xl bg-muted/30 border border-border/20 p-4 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">{fmtLabel(col)}</p>
            <p className="text-2xl font-black text-foreground tracking-tight">
              {typeof chartData[0]?.[col] === 'number' ? fmtBR(chartData[0][col]) : chartData[0]?.[col]}
            </p>
          </div>
        ))}
      </div>
    );
  }

  /* ── Pie (Donut) ── */
  if (tipo_grafico === 'pie') {
    const dataKey = displayKeys[0] || colunas[1] || '';
    return (
      <div className="mt-3">
        {titulo && <p className="text-xs font-semibold text-foreground/70 mb-2">{titulo}</p>}
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey={dataKey}
              nameKey={axisKey}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
              strokeWidth={0}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 0.5 }}
            >
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ── Area Chart (Premium gradient) ── */
  if (tipo_grafico === 'area') {
    return (
      <div className="mt-3">
        {titulo && <p className="text-xs font-semibold text-foreground/70 mb-2">{titulo}</p>}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <GradientDefs keys={displayKeys} />
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey={axisKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtBR(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {displayKeys.map((col, i) => (
              <Area
                key={col}
                type="monotone"
                dataKey={col}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                fill={`url(#areaGrad-${i})`}
                name={fmtLabel(col)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ── Line Chart ── */
  if (tipo_grafico === 'line') {
    return (
      <div className="mt-3">
        {titulo && <p className="text-xs font-semibold text-foreground/70 mb-2">{titulo}</p>}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey={axisKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtBR(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {displayKeys.map((col, i) => (
              <Line
                key={col}
                type="monotone"
                dataKey={col}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: COLORS[i % COLORS.length], strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                name={fmtLabel(col)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ── Bar Chart (stacked-ready, auto horizontal) ── */
  if (tipo_grafico === 'bar') {
    const isHorizontal = chartData.length > 8;
    const isStacked = displayKeys.length > 2;
    const h = isHorizontal ? Math.max(300, chartData.length * 30) : 300;

    return (
      <div className="mt-3">
        {titulo && <p className="text-xs font-semibold text-foreground/70 mb-2">{titulo}</p>}
        <ResponsiveContainer width="100%" height={h}>
          <BarChart
            data={chartData}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={isHorizontal ? { left: 110 } : { bottom: 5 }}
          >
            <CartesianGrid {...GRID_STYLE} />
            {isHorizontal ? (
              <>
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtBR(v)} />
                <YAxis type="category" dataKey={axisKey} tick={AXIS_TICK} width={105} axisLine={false} tickLine={false} />
              </>
            ) : (
              <>
                <XAxis dataKey={axisKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtBR(v)} />
              </>
            )}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.2)' }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {displayKeys.map((col, i) => (
              <Bar
                key={col}
                dataKey={col}
                fill={COLORS[i % COLORS.length]}
                radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                stackId={isStacked ? 'stack' : undefined}
                name={fmtLabel(col)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ── Table Fallback ── */
  const tableCols = colunas.length > 0 ? colunas : Object.keys(chartData[0]);
  return (
    <div className="mt-3">
      {titulo && <p className="text-xs font-semibold text-foreground/70 mb-2">{titulo}</p>}
      <div className="overflow-x-auto max-h-[400px] rounded-lg border border-border/20">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
            <tr className="border-b border-border/30">
              <th className="px-2.5 py-2 text-left font-semibold text-muted-foreground text-[9px] uppercase tracking-wider">#</th>
              {tableCols.map(col => (
                <th key={col} className="px-2.5 py-2 text-left font-semibold text-muted-foreground text-[9px] uppercase tracking-wider whitespace-nowrap">
                  {fmtLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                <td className="px-2.5 py-1.5 text-muted-foreground/50 font-mono text-[9px]">{i + 1}</td>
                {tableCols.map(col => (
                  <td key={col} className="px-2.5 py-1.5 max-w-[200px] truncate tabular-nums">
                    {typeof row[col] === 'number' ? fmtBR(row[col]) : row[col] ?? <span className="text-muted-foreground/30">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
